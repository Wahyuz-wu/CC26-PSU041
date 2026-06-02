import dotenv from 'dotenv';

dotenv.config();

function toInt(value, fallback) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

function splitList(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const NODE_ENV = (process.env.NODE_ENV || 'development').toLowerCase();

const config = {
  env: NODE_ENV,
  isProd: NODE_ENV === 'production',
  port: toInt(process.env.PORT, 8080),

  // CORS: daftar origin frontend yang diizinkan. Default mengizinkan dev server Vite.
  corsOrigins:
    splitList(process.env.CORS_ALLOW_ORIGINS).length > 0
      ? splitList(process.env.CORS_ALLOW_ORIGINS)
      : ['http://localhost:5173', 'http://127.0.0.1:5173'],

  // ML service (FastAPI). Default ke deployment publik di Hugging Face Spaces.
  ml: {
    baseUrl: (process.env.ML_API_BASE_URL || 'https://sughara-foreca-api.hf.space').replace(/\/+$/, ''),
    timeoutMs: toInt(process.env.ML_API_TIMEOUT_MS, 60000),
    retries: toInt(process.env.ML_API_RETRIES, 2),
  },

  // Batas ukuran file upload (byte). Default 4 MB agar aman di bawah batas
  // body 4.5 MB Vercel Functions (deploy fullstack). Bisa dinaikkan via env
  // bila backend di-host di tempat tanpa batas tersebut (mis. Render/VPS).
  upload: {
    maxBytes: toInt(process.env.UPLOAD_MAX_BYTES, 4 * 1024 * 1024),
  },

  // Konfigurasi domain model (mengikuti model_metadata.json di ML service).
  model: {
    lookback: toInt(process.env.MODEL_LOOKBACK, 30),
    horizon: toInt(process.env.MODEL_HORIZON, 7),
  },

  // Supabase bersifat OPSIONAL. Jika kedua nilai ini kosong, fitur persistensi non-aktif.
  supabase: {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '',
    table: process.env.SUPABASE_TABLE || 'analyses',
    get enabled() {
      return Boolean(this.url && this.key);
    },
  },
};

export default config;
