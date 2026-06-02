import { parseNumber, parseDateISO } from './fileParser.js';
import { ValidationError } from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Urutan kolom WAJIB sama dengan feature_columns di model_metadata.json.
 * Model meng-scale berdasarkan urutan ini.
 */
export const FEATURE_COLUMNS = [
  'Total',
  'Jumlah_Order',
  'Transaksi_Count',
  'Unique_Produk',
  'Hari_Ke',
  'y',
  'lag_1',
  'lag_7',
  'roll7_mean',
  'roll7_std',
  'roll14_mean',
  'is_zero_day',
];

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function addDaysISO(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(aIso, bIso) {
  const a = new Date(`${aIso}T00:00:00Z`).getTime();
  const b = new Date(`${bIso}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function sampleStd(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Bangun fitur model dari baris transaksi mentah + pemetaan kolom.
 *
 * @param {Array<object>} rows  Baris transaksi hasil parseFile.
 * @param {{tanggal:string, produk?:string, jumlah:string}} mapping
 * @returns {{ records, dailySeries, productTotals, meta }}
 */
export function buildFeatures(rows, mapping) {
  const { tanggal, jumlah, produk } = mapping || {};
  if (!tanggal || !jumlah) {
    throw new ValidationError('Pemetaan kolom Tanggal dan Jumlah/Revenue wajib diisi.');
  }

  // 1) Normalisasi tiap baris -> { date, amount, product }
  const clean = [];
  let skipped = 0;
  const productTotals = new Map();

  for (const row of rows) {
    if (!row || typeof row !== 'object') {
      skipped++;
      continue;
    }
    const dateISO = parseDateISO(row[tanggal]);
    const amount = parseNumber(row[jumlah]);
    if (!dateISO || !Number.isFinite(amount)) {
      skipped++;
      continue;
    }
    const product = produk && row[produk] != null ? String(row[produk]).trim() : null;
    clean.push({ dateISO, amount: Math.max(amount, 0), product });
    if (product) {
      productTotals.set(product, (productTotals.get(product) || 0) + Math.max(amount, 0));
    }
  }

  if (clean.length === 0) {
    throw new ValidationError(
      'Tidak ada baris valid setelah parsing. Pastikan kolom Tanggal & Jumlah dipetakan dengan benar.'
    );
  }

  // 2) Agregasi per hari.
  const byDay = new Map(); // dateISO -> { total, count, products:Set }
  for (const r of clean) {
    let agg = byDay.get(r.dateISO);
    if (!agg) {
      agg = { total: 0, count: 0, products: new Set() };
      byDay.set(r.dateISO, agg);
    }
    agg.total += r.amount;
    agg.count += 1;
    if (r.product) agg.products.add(r.product);
  }

  const sortedDates = [...byDay.keys()].sort();
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];

  // 3) Bentuk deret harian KONTINU (isi hari kosong dengan 0) agar lag & rolling akurat.
  const span = diffDays(firstDate, lastDate) + 1;
  const series = [];
  for (let i = 0; i < span; i++) {
    const dateISO = addDaysISO(firstDate, i);
    const agg = byDay.get(dateISO);
    const total = agg ? agg.total : 0;
    series.push({
      Tanggal: dateISO,
      Total: round2(total),
      Jumlah_Order: agg ? agg.count : 0, // proxy: jumlah order ~ jumlah baris transaksi
      Transaksi_Count: agg ? agg.count : 0,
      Unique_Produk: agg ? agg.products.size : 0,
      is_zero_day: total === 0 ? 1 : 0,
    });
  }

  // 4) Validasi kecukupan data (model butuh window lookback, default 30).
  if (series.length < config.model.lookback) {
    throw new ValidationError(
      `Data harian tidak cukup. Dibutuhkan minimal ${config.model.lookback} hari berurutan, ` +
        `tersedia ${series.length} hari (rentang ${firstDate} s/d ${lastDate}).`
    );
  }

  // 5) Fitur turunan: Hari_Ke, y, lag, rolling.
  const totals = series.map((d) => d.Total);
  const records = series.map((d, i) => {
    const window7 = totals.slice(Math.max(0, i - 6), i + 1);
    const window14 = totals.slice(Math.max(0, i - 13), i + 1);
    return {
      Tanggal: d.Tanggal,
      Total: d.Total,
      Jumlah_Order: d.Jumlah_Order,
      Transaksi_Count: d.Transaksi_Count,
      Unique_Produk: d.Unique_Produk,
      Hari_Ke: i + 1,
      y: d.Total,
      lag_1: i >= 1 ? totals[i - 1] : 0,
      lag_7: i >= 7 ? totals[i - 7] : 0,
      roll7_mean: round2(mean(window7)),
      roll7_std: round2(sampleStd(window7)),
      roll14_mean: round2(mean(window14)),
      is_zero_day: d.is_zero_day,
    };
  });

  const productTotalsArr = [...productTotals.entries()]
    .map(([name, total]) => ({ name, total: round2(total) }))
    .sort((a, b) => b.total - a.total);

  return {
    records,
    dailySeries: series,
    productTotals: productTotalsArr,
    meta: {
      nDaysContinuous: series.length,
      nDaysWithData: sortedDates.length,
      rowsParsed: clean.length,
      rowsSkipped: skipped,
      dateRange: { from: firstDate, to: lastDate },
      hasProduct: Boolean(produk),
    },
  };
}
