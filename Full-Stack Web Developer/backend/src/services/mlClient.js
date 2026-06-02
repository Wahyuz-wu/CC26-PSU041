import config from '../config/index.js';
import { logger, UpstreamError } from '../utils/logger.js';

const { baseUrl, timeoutMs, retries } = config.ml;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch dengan timeout via AbortController.
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET /health — cek apakah ML service & model siap.
 */
export async function checkHealth() {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/health`);
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: { error: err.message } };
  }
}

/**
 * GET /model-info — metadata model (lookback, horizon, mae, dsb).
 * Hasilnya boleh di-cache singkat agar tidak memanggil tiap request.
 */
let _modelInfoCache = null;
let _modelInfoAt = 0;
const MODEL_INFO_TTL = 5 * 60 * 1000;

export async function getModelInfo() {
  const now = Date.now();
  if (_modelInfoCache && now - _modelInfoAt < MODEL_INFO_TTL) {
    return _modelInfoCache;
  }
  try {
    const res = await fetchWithTimeout(`${baseUrl}/model-info`);
    if (!res.ok) return _modelInfoCache; // pakai cache lama bila ada
    _modelInfoCache = await res.json();
    _modelInfoAt = now;
    return _modelInfoCache;
  } catch {
    return _modelInfoCache;
  }
}

/**
 * POST /predict — kirim deret fitur, dapatkan forecast 7 hari.
 * Retry pada 503 (model sedang warming / cold start di HF Spaces).
 *
 * @param {Array<object>} records  Record harian (≥ lookback) berisi 12 fitur + Tanggal.
 * @returns {Promise<{last_date_in_data:string, forecast:Array<{tanggal:string, prediksi_total:number}>}>}
 */
export async function predict(records) {
  const url = `${baseUrl}/predict`;
  const payload = JSON.stringify({ data: records });

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      if (res.ok) {
        return await res.json();
      }

      const errBody = await res.json().catch(() => ({}));
      const detail = errBody.detail || errBody.error || res.statusText;

      // 422 = validasi dari sisi model (tidak perlu retry).
      if (res.status === 422) {
        throw new UpstreamError(`ML menolak data: ${detail}`, 422, errBody);
      }
      // 503 = model belum siap -> layak retry.
      if (res.status === 503 && attempt < retries) {
        logger.warn(`ML 503 (belum siap), retry ${attempt + 1}/${retries}...`);
        await sleep(1500 * (attempt + 1));
        continue;
      }
      throw new UpstreamError(`ML service error (${res.status}): ${detail}`, 502, errBody);
    } catch (err) {
      if (err instanceof UpstreamError) throw err;
      // network / timeout / abort
      lastErr = err;
      if (attempt < retries) {
        logger.warn(`Gagal menghubungi ML (${err.message}), retry ${attempt + 1}/${retries}...`);
        await sleep(1500 * (attempt + 1));
        continue;
      }
    }
  }

  throw new UpstreamError(
    `Tidak dapat menghubungi ML service di ${baseUrl} (${lastErr?.message || 'unknown'}).`,
    502
  );
}
