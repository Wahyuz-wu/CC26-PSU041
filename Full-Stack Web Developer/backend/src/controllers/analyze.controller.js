import { asyncHandler } from '../middleware/errorHandler.js';
import { ValidationError } from '../utils/logger.js';
import { parseFile } from '../services/fileParser.js';
import { buildFeatures } from '../services/featureEngineer.js';
import { predict, getModelInfo } from '../services/mlClient.js';
import { buildAnalysis } from '../services/insights.js';
import { saveAnalysis, listAnalyses, isEnabled as supabaseEnabled } from '../services/supabase.js';

function requireFile(req) {
  if (!req.file || !req.file.buffer) {
    throw new ValidationError('File tidak ditemukan. Sertakan file pada field "file".');
  }
  return req.file;
}

/**
 * POST /api/inspect  (multipart: file)
 * Membaca header file dan mengembalikan daftar kolom + preview,
 * untuk mengisi pemetaan kolom di frontend.
 */
export const inspect = asyncHandler(async (req, res) => {
  const file = requireFile(req);
  const { columns, rows } = parseFile(file.buffer, file.originalname);
  res.json({
    status: 'success',
    filename: file.originalname,
    columns,
    rowCount: rows.length,
    preview: rows.slice(0, 5),
  });
});

/**
 * POST /api/analyze  (multipart: file + mapping)
 * Pipeline penuh: parse -> feature engineering -> ML predict -> analitik.
 * mapping dikirim sebagai JSON string pada field "mapping", contoh:
 *   { "tanggal": "Tanggal", "jumlah": "Total", "produk": "Produk" }
 */
export const analyze = asyncHandler(async (req, res) => {
  const file = requireFile(req);

  let mapping;
  try {
    mapping = typeof req.body.mapping === 'string' ? JSON.parse(req.body.mapping) : req.body.mapping;
  } catch {
    throw new ValidationError('Field "mapping" harus berupa JSON yang valid.');
  }
  if (!mapping || !mapping.tanggal || !mapping.jumlah) {
    throw new ValidationError('Pemetaan kolom "tanggal" dan "jumlah" wajib diisi.');
  }

  // 1) Parse file -> baris transaksi
  const { rows } = parseFile(file.buffer, file.originalname);

  // 2) Feature engineering -> deret harian + 12 fitur model
  const { records, dailySeries, productTotals, meta } = buildFeatures(rows, mapping);

  // 3) Panggil ML service
  const prediction = await predict(records);

  // 4) Metadata model (untuk KPI akurasi) + lapisan analitik
  const modelInfo = await getModelInfo();
  const analysis = buildAnalysis({
    dailySeries,
    productTotals,
    forecast: prediction.forecast,
    modelInfo,
  });

  // 5) Persistensi opsional (best-effort, hanya ringkasan — bukan data mentah)
  const summary = { meta, analysis };
  const persisted = await saveAnalysis(summary);

  res.json({
    status: 'success',
    filename: file.originalname,
    meta,
    lastDateInData: prediction.last_date_in_data,
    analysis,
    persisted,
  });
});

/**
 * GET /api/history — daftar ringkasan analisis (hanya jika Supabase aktif).
 */
export const history = asyncHandler(async (_req, res) => {
  if (!supabaseEnabled()) {
    return res.json({ status: 'success', enabled: false, items: [] });
  }
  const items = await listAnalyses(20);
  res.json({ status: 'success', enabled: true, items });
});
