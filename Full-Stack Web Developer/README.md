# Foreca — Full-Stack React (Frontend + Backend + ML)

Aplikasi forecasting penjualan UMKM. Tiga komponen yang **sudah dibuat sinkron**
sehingga bisa dijalankan bersama dengan **satu perintah**.

```
frontend/    Vite + React        UI: landing + dashboard (upload → proses → hasil)
backend/     Express (Node.js)   BFF: parsing, feature engineering, analitik, proxy ML
ml-service/  FastAPI (Python)    Model CNN-LSTM (juga tersedia online di Hugging Face)
```

## Arsitektur

```
┌──────────────┐  upload file   ┌─────────────────┐  /predict (JSON)  ┌────────────────┐
│  Frontend    │ ─────────────► │  Backend Express│ ────────────────► │  ML FastAPI    │
│  (Vite/React)│ ◄───────────── │  (BFF gateway)  │ ◄──────────────── │  (CNN-LSTM)    │
└──────────────┘  hasil + KPI   └─────────────────┘  forecast 7 hari  └────────────────┘
       :5173                            :8080                            :7860 / HF Spaces
```

Frontend hanya punya file transaksi mentah; backend Express mem-parse file (CSV/XLSX/JSON),
mengagregasi ke deret harian, menghitung **12 fitur** (`Total, lag_1, lag_7, roll7_mean, …`),
memanggil model, lalu menurunkan KPI, insight, analisis penyebab, dan rekomendasi.

---

## Prasyarat

- **Node.js ≥ 18.17** (wajib — untuk frontend & backend)
- **Python ≥ 3.10** (opsional — hanya bila ingin menjalankan model TensorFlow asli secara lokal)

Cek: `node -v`

---

## Cara menjalankan

### 🚀 Opsi A — Satu perintah (paling mudah, 100% offline, tanpa Python)

Mode ini memakai **mock ML server** bawaan, jadi tidak butuh Python/TensorFlow maupun internet.
Semua port sudah otomatis tersambung satu sama lain.

```bash
# 1) Install semua dependency (root + backend + frontend) — cukup sekali
npm run install:all

# 2) Jalankan ketiga layanan sekaligus (Mock-ML + Backend + Frontend)
npm run dev
```

Tunggu hingga muncul log `[FRONTEND] Local: http://localhost:5173/`, lalu buka:

> **http://localhost:5173**

Yang dijalankan oleh `npm run dev`:

| Label       | Port  | Keterangan                                   |
|-------------|-------|----------------------------------------------|
| `MOCK-ML`   | 7860  | Tiruan kontrak FastAPI (`/health`, `/predict`) |
| `BACKEND`   | 8080  | Express BFF, otomatis menunjuk ke Mock-ML    |
| `FRONTEND`  | 5173  | React/Vite dev server                        |

Hentikan semuanya dengan `Ctrl + C` (satu kali menutup ketiganya).

### 🤖 Opsi B — Pakai model AI asli (cloud Hugging Face)

Backend default sudah menunjuk ke deployment publik. Cukup jalankan backend + frontend:

```bash
npm run install:all
npm run dev:hf          # Backend → ML cloud, Frontend → :5173
```

### 🐍 Opsi C — Model TensorFlow asli secara lokal (3 terminal)

```bash
# Terminal 1 — ML service Python
cd ml-service
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 7860

# Terminal 2 — Backend (arahkan ke ML lokal)
cd backend && npm install
ML_API_BASE_URL=http://localhost:7860 npm run dev   # http://localhost:8080

# Terminal 3 — Frontend
cd frontend && npm install
npm run dev                                          # http://localhost:5173
```

---

## ✅ Langkah testing penggunaan aplikasi web (lewat UI)

Ikuti langkah ini setelah menjalankan **Opsi A** (`npm run dev`):

1. **Pastikan backend & ML sehat.** Buka di browser: `http://localhost:8080/api/health`.
   Harus muncul `"status":"ok"` dan `"ml":{"reachable":true,...}`.
   Jika `reachable:false`, tunggu beberapa detik (ML sedang start) lalu refresh.

2. **Buka aplikasi.** Kunjungi **http://localhost:5173** → klik tombol **"Mulai Analisis"**
   di navbar (atau pergi ke `http://localhost:5173/#/dashboard`).

3. **Upload data contoh.** Sudah disediakan file siap pakai:
   **`sample-data/penjualan-contoh.csv`** (45 hari, 358 transaksi, kolom `Tanggal, Produk, Total`).
   Seret file itu ke area upload, atau klik **"Pilih File"** dan pilih file tersebut.

4. **Periksa pemetaan kolom (auto-detect).** Setelah file terbaca, panel "Petakan Kolom Data"
   akan terisi otomatis:
   - Kolom Tanggal → `Tanggal`
   - Kolom Produk → `Produk`
   - Kolom Jumlah / Revenue → `Total`

   Tombol **"Proses Data"** akan aktif begitu Tanggal & Jumlah terpilih.

5. **Klik "Proses Data".** Stepper berpindah ke tahap **Proses**; animasi 5 langkah berjalan
   sementara request dikirim ke backend → ML. Biasanya selesai dalam beberapa detik.

6. **Verifikasi halaman Hasil.** Pastikan muncul:
   - **4 kartu KPI**: Total 7 Hari Terakhir, Forecast 7 Hari ke Depan, Rata-rata Harian, MAE Model.
   - **Grafik Forecast**: 7 bar abu-abu (aktual) + 7 bar hijau-lime (prediksi).
   - **Insight Tren** (mis. "Weekend Gap Signifikan", "Puncak Penjualan: Hari …").
   - **Analisis Penyebab**: bar kontribusi per produk (Kopi Susu mendominasi).
   - **Rekomendasi Tindakan**: beberapa kartu prioritas berwarna.

7. **Uji skenario kesalahan (opsional tapi disarankan):**
   - Upload file `.txt` → toast merah "Format file tidak didukung".
   - Upload CSV < 30 hari → setelah Proses, muncul toast error "Data harian tidak cukup…".
   - Hapus file (tombol ✕) sebelum Proses → tombol Proses kembali non-aktif.

8. **Reset.** Di halaman Hasil klik **"Analisis Data Baru"** → kembali ke langkah Upload.

> 💡 **Membuat data uji sendiri:** file CSV/XLSX/JSON apa pun bisa dipakai asalkan punya
> minimal **30 hari berurutan**, satu kolom tanggal, dan satu kolom angka (revenue/jumlah).
> Kolom produk bersifat opsional (mengaktifkan Analisis Penyebab).

---

## 🔧 Testing manual lewat API (curl)

Dengan layanan berjalan (`npm run dev`):

```bash
# Health
curl http://localhost:8080/api/health

# Inspect — daftar kolom + preview
curl -F "file=@sample-data/penjualan-contoh.csv" http://localhost:8080/api/inspect

# Analyze — forecast + KPI + insight + rekomendasi
curl -F "file=@sample-data/penjualan-contoh.csv" \
     -F 'mapping={"tanggal":"Tanggal","jumlah":"Total","produk":"Produk"}' \
     http://localhost:8080/api/analyze
```

| Method | Path              | Keterangan                                   |
|--------|-------------------|----------------------------------------------|
| GET    | `/api/health`     | Status backend + readiness ML + Supabase     |
| GET    | `/api/model-info` | Proxy metadata model                         |
| POST   | `/api/inspect`    | multipart `file` → kolom + preview           |
| POST   | `/api/analyze`    | multipart `file` + `mapping` → hasil analisis|
| GET    | `/api/history`    | Histori ringkasan (bila Supabase aktif)      |

---

## 🧪 Automated tests (backend)

```bash
npm test            # = node --test : 13 unit + integrasi, pakai mock ML (tanpa internet/Python)
```

ML service Python punya test sendiri:

```bash
cd ml-service && pytest
```

---

## Konfigurasi (opsional)

Default sudah jalan tanpa file `.env`. Untuk override, salin contoh:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

- `backend/.env` → `PORT`, `ML_API_BASE_URL`, `CORS_ALLOW_ORIGINS`, `UPLOAD_MAX_BYTES`, Supabase.
- `frontend/.env` → `VITE_API_BASE_URL` (default `http://localhost:8080`).

**Supabase bersifat opsional.** Bila `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` kosong, persistensi
otomatis non-aktif dan aplikasi tetap berjalan normal. Lihat `backend/README.md` untuk detail.

---

## Struktur proyek

```
foreca-fullstack-react/
├── package.json            # orkestrator root (install:all, dev, dev:hf, test)
├── sample-data/
│   └── penjualan-contoh.csv  # data uji 45 hari siap upload
├── frontend/               # React + Vite (lihat src/pages, src/components)
├── backend/                # Express BFF (lihat backend/README.md)
└── ml-service/             # FastAPI + model CNN-LSTM (lihat ml-service/README.md)
```
