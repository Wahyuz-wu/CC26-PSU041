# Deploy Fullstack di Vercel (Frontend + Backend dalam satu proyek)

Konfigurasi ini sudah disiapkan & diuji. Frontend (React statis) dan backend
(Express) berjalan di **satu domain Vercel**: backend menjadi **Serverless
Function** di `/api`, frontend memanggilnya secara **same-origin** (tanpa CORS).

```
https://proyek-kamu.vercel.app/            → Frontend React (statis)
https://proyek-kamu.vercel.app/api/health  → Backend Express (serverless function)
                                   │
                                   └─► ML service di Hugging Face (sudah online)
```

## File yang sudah ditambahkan/diubah untuk ini
- `api/index.js` — membungkus `createApp()` Express sebagai handler serverless.
- `vercel.json` — build frontend, route `/api/*` ke function, `maxDuration` 60s.
- `package.json` (root) — menambахkan dependency runtime backend + `vercel-build`.
- `frontend/src/services/api.js` — saat production tanpa env, memakai `/api`
  same-origin (dev lokal tetap ke `http://localhost:8080`).
- `backend/src/config/index.js` — default batas upload 4 MB (aman di bawah
  limit body 4.5 MB Vercel).

---

## Batasan penting (Vercel Functions)
1. **Body maksimum 4.5 MB.** Upload file > ~4.5 MB akan gagal (413). Default
   batas sudah diset 4 MB. Untuk data penjualan CSV/XLSX biasanya cukup.
2. **Durasi function:** tier gratis Hobby punya batas waktu eksekusi; sudah
   diset `maxDuration: 60`. Jika ML di Hugging Face "tidur" (cold start) dan
   lambat, request pertama bisa mendekati batas — coba ulang bila timeout.
3. **Tanpa filesystem persisten.** Tidak masalah di sini karena upload diproses
   di memori (multer memoryStorage) dan tidak ada penulisan ke disk.
4. **Plan Hobby = non-komersial.** Untuk tugas/portofolio aman.

---

## LANGKAH DEPLOY

### 1. Pastikan kode terbaru ada di GitHub
```bash
git add api vercel.json package.json frontend/src/services/api.js backend/src/config/index.js
git commit -m "Setup deploy fullstack di Vercel"
git push
```

### 2. Import proyek di Vercel
1. Buka https://vercel.com → login (pakai GitHub).
2. **Add New...** → **Project** → pilih repo `foreca-fullstack-react` → **Import**.

### 3. Konfigurasi build (PENTING)
- **Root Directory:** biarkan **`.`** (root repo) — JANGAN diset ke `frontend`,
  karena backend ada di `api/` pada root. (Ini berbeda dari skenario
  "frontend-only" yang memakai root `frontend`.)
- **Framework Preset:** Other (atau biarkan auto). Build & output sudah diatur
  oleh `vercel.json` (`vercel-build` + `frontend/dist`), jadi field Build
  Command / Output Directory bisa dibiarkan default/kosong.

### 4. Environment Variables
Tambahkan yang diperlукan backend (Settings → Environment Variables):

| Key | Value | Wajib? |
|-----|-------|:---:|
| `ML_API_BASE_URL` | `https://sughara-foreca-api.hf.space` | ya |
| `NODE_ENV` | `production` | disarankan |
| `UPLOAD_MAX_BYTES` | `4194304` | opsional (4 MB) |
| `SUPABASE_URL` | `https://xxx.supabase.co` | hanya jika pakai Supabase |
| `SUPABASE_SERVICE_KEY` | `sb_secret_...` | hanya jika pakai Supabase |
| `SUPABASE_TABLE` | `analyses` | hanya jika pakai Supabase |

> JANGAN set `VITE_API_BASE_URL`. Dibiarkan kosong agar frontend memakai `/api`
> di domain yang sama. (Jika di-set, frontend akan menembak URL itu — hanya
> berguna kalau backend dipisah ke host lain.)
>
> JANGAN set `CORS_ALLOW_ORIGINS` — same-origin tidak butuh CORS.

### 5. Deploy
Klik **Deploy**. Tunggu sampai selesai, catat URL `https://....vercel.app`.

### 6. Verifikasi
1. Buka `https://<domain>/api/health` → JSON `"status":"ok"`,
   `"ml":{"reachable":true}`.
2. Buka `https://<domain>/` → Dashboard → upload `sample-data/penjualan-contoh.csv`
   → **Proses Data** → halaman Hasil muncul lengkap.
3. Jika pakai Supabase: cek `https://<domain>/api/history`.

### 7. Update berikutnya
Cukup `git push` — Vercel auto-redeploy frontend + function.

---

## Catatan untuk run lokal (tetap berfungsi)
Perubahan ini TIDAK mengganggu pengembangan lokal:
```bash
npm run install:all
npm run dev          # Mock-ML :7860 + Backend :8080 + Frontend :5173
```
Saat `vite dev`, frontend tetap menembak `http://localhost:8080` seperti biasa.

## Troubleshooting
| Gejala | Penyebab & solusi |
|---|---|
| `/api/health` 404 | Root Directory salah diset ke `frontend`. Set ke `.` (root) lalu redeploy |
| Frontend tampil, analisis menembak localhost | Tidak sengaja mengisi `VITE_API_BASE_URL`. Kosongkan → redeploy |
| 413 FUNCTION_PAYLOAD_TOO_LARGE | File > 4.5 MB. Perkecil file atau pisah backend ke Render |
| Timeout saat analisis pertama | ML cold start di Hugging Face. Tunggu & ulangi |
| `ml.reachable:false` | `ML_API_BASE_URL` salah/tidak diset, atau ML Space sleep |
| Function error "Cannot find package" | Pastikan dependency backend ada di `package.json` ROOT (sudah disiapkan) |
