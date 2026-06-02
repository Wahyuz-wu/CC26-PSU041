# Foreca Backend (Express BFF)

Gateway antara frontend dan ML service. Bertanggung jawab atas parsing file,
feature engineering, pemanggilan model, lapisan analitik, dan (opsional) persistensi.

## Struktur

```
src/
├── config/index.js              # konfigurasi dari env
├── server.js                    # entry point (listen + graceful shutdown)
├── app.js                       # factory Express (middleware + routes)
├── routes/index.js              # definisi endpoint
├── controllers/
│   ├── health.controller.js     # /health, /model-info
│   └── analyze.controller.js    # /inspect, /analyze, /history
├── services/
│   ├── fileParser.js            # CSV/XLSX/JSON + parser angka & tanggal ID
│   ├── featureEngineer.js       # transaksi → 12 fitur model
│   ├── mlClient.js              # panggil FastAPI (timeout + retry)
│   ├── insights.js              # KPI, insight, penyebab, rekomendasi
│   └── supabase.js              # persistensi opsional
├── middleware/
│   ├── upload.js                # multer (in-memory, batas ukuran/tipe)
│   └── errorHandler.js          # error & 404 terpusat
└── utils/logger.js              # logger + kelas error
```

## Endpoint

| Method | Path              | Keterangan |
|--------|-------------------|------------|
| GET    | `/api/health`     | Status backend + readiness ML + status Supabase |
| GET    | `/api/model-info` | Proxy metadata model |
| POST   | `/api/inspect`    | multipart `file` → daftar kolom + preview |
| POST   | `/api/analyze`    | multipart `file` + `mapping` → forecast + analitik |
| GET    | `/api/history`    | Histori ringkasan (jika Supabase aktif) |

Contoh `mapping` (string JSON pada form field):
```json
{ "tanggal": "Tanggal", "jumlah": "Total", "produk": "Produk" }
```

## Testing

```bash
npm test            # node --test : unit (feature engineering) + integrasi (API)
```

Tes integrasi memakai **mock ML server** bawaan (`tests/helpers/mockMlServer.js`),
jadi tidak butuh Python/TensorFlow maupun koneksi internet.

Tips:
- Cek `GET /api/health` lebih dulu — pastikan `ml.reachable: true` sebelum analisis.
- Dev offline: jalankan `npm run mock-ml`, lalu set `ML_API_BASE_URL=http://localhost:7860` di `.env`.
- Contoh manual:
  ```bash
  curl -F "file=@data.csv" \
       -F 'mapping={"tanggal":"Tanggal","jumlah":"Total","produk":"Produk"}' \
       http://localhost:8080/api/analyze
  ```
