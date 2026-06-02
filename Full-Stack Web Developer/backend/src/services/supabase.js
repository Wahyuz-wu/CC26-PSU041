import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Persistensi OPSIONAL ke Supabase.
 *
 * Catatan privasi: kita SENGAJA hanya menyimpan ringkasan hasil analisis
 * (rentang tanggal, jumlah hari, total forecast, insight) — BUKAN data
 * mentah penjualan yang diupload. Ini menjaga janji "data tidak disimpan"
 * pada UI sambil tetap memberi histori analisis yang berguna.
 *
 * Jika SUPABASE_URL / SUPABASE_*_KEY tidak diset, modul ini menjadi no-op.
 */
let client = null;

if (config.supabase.enabled) {
  client = createClient(config.supabase.url, config.supabase.key, {
    auth: { persistSession: false },
  });
  logger.info('Supabase aktif — ringkasan analisis akan disimpan.');
} else {
  logger.info('Supabase non-aktif (env tidak diset) — persistensi dilewati.');
}

export const isEnabled = () => Boolean(client);

/**
 * Simpan ringkasan analisis. Best-effort: kegagalan TIDAK menggagalkan request.
 * @returns {Promise<{id:string|null, stored:boolean}>}
 */
export async function saveAnalysis(summary) {
  if (!client) return { id: null, stored: false };
  try {
    const row = {
      created_at: new Date().toISOString(),
      n_days: summary.meta?.nDaysContinuous ?? null,
      date_from: summary.meta?.dateRange?.from ?? null,
      date_to: summary.meta?.dateRange?.to ?? null,
      forecast_total: summary.analysis?.kpis?.forecastNext7 ?? null,
      model_version: summary.analysis?.kpis?.model_version ?? null,
      insights: summary.analysis?.insights ?? [],
      forecast: summary.analysis?.forecast ?? [],
    };
    const { data, error } = await client
      .from(config.supabase.table)
      .insert(row)
      .select('id')
      .single();
    if (error) {
      logger.warn('Gagal menyimpan ke Supabase:', error.message);
      return { id: null, stored: false };
    }
    return { id: data?.id ?? null, stored: true };
  } catch (err) {
    logger.warn('Exception saat menyimpan ke Supabase:', err.message);
    return { id: null, stored: false };
  }
}

/**
 * Ambil histori analisis terakhir (untuk endpoint GET /api/history).
 */
export async function listAnalyses(limit = 20) {
  if (!client) return [];
  try {
    const { data, error } = await client
      .from(config.supabase.table)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      logger.warn('Gagal membaca histori Supabase:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    logger.warn('Exception saat membaca Supabase:', err.message);
    return [];
  }
}
