/**
 * Lapisan networking frontend — semua komunikasi ke backend Express lewat fetch.
 *
 * Penentuan base URL:
 *  1. Jika VITE_API_BASE_URL di-set (mis. backend terpisah di Render), pakai itu.
 *  2. Saat build production tanpa env (mis. fullstack di Vercel: backend ada di
 *     /api domain yang sama), pakai string kosong → request relatif same-origin.
 *  3. Saat dev lokal (vite dev), default ke http://localhost:8080.
 */
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? '' : 'http://localhost:8080')
).replace(/\/+$/, '');

async function handle(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* body bukan JSON */
  }
  if (!res.ok) {
    const msg = body?.message || body?.detail || `Request gagal (HTTP ${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/**
 * Cek kesehatan backend + ML service.
 */
export async function getHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  return handle(res);
}

/**
 * Inspect file: kirim file, dapatkan daftar kolom untuk pemetaan.
 * @param {File} file
 */
export async function inspectFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_BASE}/api/inspect`, { method: 'POST', body: fd });
  return handle(res);
}

/**
 * Analisis penuh: kirim file + pemetaan kolom, dapatkan forecast + insight.
 * @param {File} file
 * @param {{tanggal:string, produk?:string, jumlah:string}} mapping
 */
export async function analyzeFile(file, mapping) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('mapping', JSON.stringify(mapping));
  const res = await fetch(`${API_BASE}/api/analyze`, { method: 'POST', body: fd });
  return handle(res);
}

export { API_BASE };
