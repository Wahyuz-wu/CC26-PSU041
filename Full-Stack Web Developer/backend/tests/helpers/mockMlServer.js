/**
 * Mock ML server — meniru kontrak FastAPI (/health, /model-info, /predict)
 * tanpa perlu TensorFlow/Python. Berguna untuk testing & dev offline.
 *
 * Jalankan: node tests/helpers/mockMlServer.js   (default port 7860)
 * Lalu set ML_API_BASE_URL=http://localhost:7860 di backend.
 */
import http from 'node:http';

const PORT = process.env.MOCK_ML_PORT || 7860;

const METADATA = {
  model_name: 'Foreca_CNN_LSTM_MOCK',
  version: '1.0.0-mock',
  lookback: 30,
  horizon: 7,
  n_features: 12,
  feature_columns: [
    'Total', 'Jumlah_Order', 'Transaksi_Count', 'Unique_Produk',
    'Hari_Ke', 'y', 'lag_1', 'lag_7',
    'roll7_mean', 'roll7_std', 'roll14_mean', 'is_zero_day',
  ],
  trained_at: '2026-05-17T08:40:34.558166',
  mae_rupiah: 3722839.29,
  rmse_rupiah: 5171270.66,
};

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function createMockMlServer() {
  return http.createServer((req, res) => {
    const send = (code, obj) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };

    if (req.method === 'GET' && req.url === '/health') {
      return send(200, { status: 'ok', message: 'mock running', model: METADATA.model_name, version: METADATA.version });
    }
    if (req.method === 'GET' && req.url === '/model-info') {
      return send(200, METADATA);
    }
    if (req.method === 'POST' && req.url === '/predict') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          return send(422, { detail: 'JSON tidak valid' });
        }
        const data = parsed?.data;
        if (!Array.isArray(data) || data.length < 30) {
          return send(422, { detail: 'Data minimal 30 baris untuk prediksi' });
        }
        const last = data[data.length - 1];
        const lastDate = String(last.Tanggal).slice(0, 10);
        const base = Number(last.Total) || 1000000;
        // Forecast deterministik sederhana: variasi ringan di sekitar nilai terakhir.
        const forecast = Array.from({ length: 7 }, (_, i) => ({
          tanggal: addDays(lastDate, i + 1),
          prediksi_total: Math.round(base * (1 + (i % 3 === 0 ? 0.05 : -0.02))),
        }));
        return send(200, { status: 'success', last_date_in_data: lastDate, forecast });
      });
      return;
    }
    send(404, { detail: 'not found' });
  });
}

// Jalankan langsung bila dipanggil sebagai script.
const isMain = process.argv[1] && process.argv[1].endsWith('mockMlServer.js');
if (isMain) {
  createMockMlServer().listen(PORT, () => {
    console.log(`Mock ML server di http://localhost:${PORT}`);
  });
}
