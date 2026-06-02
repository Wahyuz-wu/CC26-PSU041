# Panduan Deployment Foreca ke Server

Aplikasi ini punya 3 komponen. Strategi deployment paling praktis:

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│ FRONTEND (statis)   │ ──► │ BACKEND (Node/Express)│ ──► │ ML SERVICE (FastAPI)│
│ Vite build → CDN    │     │ Web service           │     │ Hugging Face Spaces │
│ Vercel / Netlify    │     │ Render / Railway / VPS│     │ (SUDAH ter-deploy)  │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

- **ML service** sudah online di Hugging Face Spaces (`https://sughara-foreca-api.hf.space`),
  jadi default-nya kamu TIDAK perlu deploy ulang ML. (Cara deploy ulang ada di Bagian D.)
- Yang wajib kamu deploy: **Backend** lalu **Frontend** (urutan ini penting, karena
  frontend perlu tahu URL backend saat di-build).

Pilih SALAH SATU jalur:
- **Jalur 1 — PaaS (paling mudah, gratis):** Backend di Render, Frontend di Vercel. → Bagian A & B.
- **Jalur 2 — VPS sendiri** (DigitalOcean/EC2/dll, satu server, pakai PM2 + Nginx). → Bagian C.

Prasyarat umum: kode sudah ada di GitHub (lihat panduan GitHub sebelumnya).

---

# JALUR 1 — PaaS (Render + Vercel)

## BAGIAN A — Deploy BACKEND ke Render

### A1. Daftar & hubungkan repo
1. Buka https://render.com → Sign up (login pakai GitHub paling mudah).
2. Dashboard → **New +** → **Web Service**.
3. **Connect a repository** → pilih repo `foreca-fullstack-react`.
   (Jika belum muncul, klik "Configure account" untuk memberi akses Render ke repo.)

### A2. Konfigurasi service
Isi formulir berikut:
- **Name:** `foreca-backend`
- **Region:** Singapore (terdekat).
- **Branch:** `main`
- **Root Directory:** `backend`   ← PENTING, karena backend ada di subfolder.
- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Instance Type:** Free (cukup untuk mulai).

### A3. Set Environment Variables
Scroll ke bagian **Environment Variables** → tambahkan (Add Environment Variable):

| Key | Value | Keterangan |
|-----|-------|------------|
| `NODE_ENV` | `production` | |
| `ML_API_BASE_URL` | `https://sughara-foreca-api.hf.space` | ML di Hugging Face |
| `CORS_ALLOW_ORIGINS` | *(isi nanti di A6)* | URL frontend; sementara kosongkan |
| `UPLOAD_MAX_BYTES` | `5242880` | 5 MB |

Jika memakai Supabase, tambahkan juga:
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `sb_secret_...` |
| `SUPABASE_TABLE` | `analyses` |

> JANGAN set `PORT` manual — Render menyuntik `PORT` sendiri, dan kode kita sudah
> membaca `process.env.PORT` otomatis.

### A4. Deploy
1. Klik **Create Web Service**. Render akan build & start (lihat tab **Logs**).
2. Tunggu sampai log menampilkan `Foreca backend berjalan ...` dan status jadi **Live**.
3. Catat URL publiknya, bentuknya: `https://foreca-backend.onrender.com`

### A5. Verifikasi backend
Buka di browser: `https://foreca-backend.onrender.com/api/health`
Harus muncul JSON `"status":"ok"` dan `"ml":{"reachable":true}`.
(Catatan: di plan Free, service "tidur" setelah idle; request pertama bisa lambat ±30 detik.)

> CORS_ALLOW_ORIGINS akan kita lengkapi di langkah A6 SETELAH tahu URL frontend.

---

## BAGIAN B — Deploy FRONTEND ke Vercel

### B1. Daftar & import repo
1. Buka https://vercel.com → Sign up (login pakai GitHub).
2. **Add New...** → **Project** → pilih repo `foreca-fullstack-react` → **Import**.

### B2. Konfigurasi build
- **Framework Preset:** Vite (biasanya terdeteksi otomatis).
- **Root Directory:** klik **Edit** → pilih `frontend`.   ← PENTING.
- **Build Command:** `npm run build` (default).
- **Output Directory:** `dist` (default).

### B3. Set Environment Variable (WAJIB sebelum build)
Buka **Environment Variables** → tambahkan:

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://foreca-backend.onrender.com` |

(Pakai URL backend dari langkah A4, TANPA garis miring di akhir.)

> Variabel `VITE_*` di-"bake" ke dalam bundle saat build. Karena itu harus diisi
> SEBELUM klik Deploy. Jika diubah belakangan, harus **Redeploy**.

### B4. Deploy
1. Klik **Deploy**. Tunggu sampai selesai.
2. Catat URL frontend, bentuknya: `https://foreca-xxxx.vercel.app`

---

## BAGIAN A6 — Lengkapi CORS di backend (langkah penghubung)

Sekarang backend perlu mengizinkan origin frontend:
1. Kembali ke Render → service `foreca-backend` → **Environment**.
2. Edit/`Add` variabel `CORS_ALLOW_ORIGINS` =
   `https://foreca-xxxx.vercel.app`
   (URL Vercel dari B4. Bila ada beberapa domain, pisahkan dengan koma, tanpa spasi.)
3. **Save Changes** → Render akan otomatis redeploy backend.

### Uji end-to-end
1. Buka URL frontend Vercel.
2. Masuk ke Dashboard → upload `sample-data/penjualan-contoh.csv` → Proses Data.
3. Harus muncul halaman Hasil lengkap. Jika gagal, buka DevTools (F12) → tab
   Console/Network untuk melihat error (sering kali CORS atau URL backend salah).

---

# JALUR 2 — VPS sendiri (Ubuntu + Nginx + PM2)

Cocok jika ingin semua di satu server (mis. DigitalOcean Droplet, AWS EC2, dll).
Asumsi: VPS Ubuntu 22.04, sudah bisa SSH, punya domain (mis. `foreca.contoh.com`)
yang A-record-nya mengarah ke IP server.

### C1. Login & install dependency dasar
```bash
ssh root@IP_SERVER

# Update & install Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx

# PM2 (process manager) + serve (untuk static frontend, opsional)
sudo npm install -g pm2
node -v && nginx -v
```

### C2. Ambil kode
```bash
cd /var/www
sudo git clone https://github.com/USERNAME/foreca-fullstack-react.git
sudo chown -R $USER:$USER foreca-fullstack-react
cd foreca-fullstack-react
```

### C3. Siapkan & jalankan BACKEND dengan PM2
```bash
cd /var/www/foreca-fullstack-react/backend
npm install --omit=dev

# Buat file .env produksi
cat > .env << 'EOF'
NODE_ENV=production
PORT=8080
ML_API_BASE_URL=https://sughara-foreca-api.hf.space
CORS_ALLOW_ORIGINS=https://foreca.contoh.com
UPLOAD_MAX_BYTES=5242880
# Supabase (opsional):
# SUPABASE_URL=https://xxx.supabase.co
# SUPABASE_SERVICE_KEY=sb_secret_xxx
# SUPABASE_TABLE=analyses
EOF

# Jalankan & set auto-start saat reboot
pm2 start src/server.js --name foreca-backend
pm2 save
pm2 startup    # jalankan perintah yang ditampilkannya (untuk systemd)
pm2 status
```

Cek lokal di server: `curl http://localhost:8080/api/health` → harus `"status":"ok"`.

### C4. Build FRONTEND (jadi file statis)
```bash
cd /var/www/foreca-fullstack-react/frontend
npm install

# Arahkan frontend ke backend lewat domain (lihat C5: backend di-proxy pada /api)
echo "VITE_API_BASE_URL=https://foreca.contoh.com" > .env.production

npm run build      # hasilnya di folder dist/
```

### C5. Konfigurasi Nginx (serve frontend + proxy /api ke backend)
```bash
sudo tee /etc/nginx/sites-available/foreca << 'EOF'
server {
    listen 80;
    server_name foreca.contoh.com;

    # Frontend statis (hasil vite build)
    root /var/www/foreca-fullstack-react/frontend/dist;
    index index.html;

    # SPA fallback (React Router / hash router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy semua /api ke backend Node di port 8080
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10M;   # izinkan upload file
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/foreca /etc/nginx/sites-enabled/
sudo nginx -t          # tes konfigurasi
sudo systemctl reload nginx
```

> Karena frontend & backend kini satu domain (`foreca.contoh.com`, `/api` di-proxy),
> CORS praktis tidak jadi masalah. `VITE_API_BASE_URL` cukup di-set ke domain itu.

### C6. Pasang HTTPS (Let's Encrypt, gratis)
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d foreca.contoh.com
# ikuti prompt; certbot otomatis meng-update config Nginx ke HTTPS + auto-renew
```

### C7. Verifikasi
Buka `https://foreca.contoh.com` → lakukan alur upload → Proses → Hasil.

### Update kode di VPS (setiap ada perubahan)
```bash
cd /var/www/foreca-fullstack-react
git pull
# Backend berubah:
cd backend && npm install --omit=dev && pm2 restart foreca-backend
# Frontend berubah:
cd ../frontend && npm install && npm run build   # Nginx langsung serve dist/ baru
```

---

# BAGIAN D — (Opsional) Deploy ulang ML service ke Hugging Face

Hanya jika kamu ingin meng-host model sendiri (bukan pakai Space yang sudah ada).

1. Buat akun di https://huggingface.co → **New** → **Space**.
2. **SDK:** pilih **Docker** (atau langsung pilih template FastAPI bila tersedia).
3. **Space name:** mis. `foreca-api` → Create.
4. Upload isi folder `ml-service/` ke Space (lewat web UI "Files" atau `git push`
   ke remote Space). Pastikan ada `main.py`, `requirements.txt`, `Dockerfile`
   (jika SDK Docker), dan folder `artifacts/` berisi model `.keras` + metadata.
5. Space akan otomatis build & menjalankan FastAPI di port 7860.
6. URL Space-mu, mis. `https://USERNAME-foreca-api.hf.space`, lalu set sebagai
   `ML_API_BASE_URL` di environment backend (Render / VPS .env) → redeploy/restart backend.

> Detail spesifik (Dockerfile/port) ada di `ml-service/README.md`.

---

# Checklist pasca-deploy
- [ ] `GET <backend>/api/health` → `status:ok`, `ml.reachable:true`
- [ ] `CORS_ALLOW_ORIGINS` backend berisi domain frontend (Jalur 1)
- [ ] `VITE_API_BASE_URL` frontend menunjuk ke backend yang benar (tanpa `/` di akhir)
- [ ] Upload → Proses → Hasil berhasil dari domain produksi
- [ ] (Jika pakai) Supabase: `/api/history` mengembalikan data; `supabase.enabled:true`
- [ ] HTTPS aktif (Vercel/Render otomatis; VPS lewat certbot)
- [ ] `.env` produksi TIDAK ter-commit ke GitHub

# Troubleshooting umum
| Gejala | Penyebab & solusi |
|---|---|
| Frontend tampil, tapi analisis gagal | `VITE_API_BASE_URL` salah / belum di-redeploy setelah diubah |
| Error CORS di Console browser | `CORS_ALLOW_ORIGINS` backend belum berisi URL frontend (persis, dengan https) |
| `ml.reachable:false` | ML Space sedang sleep/cold start; tunggu & refresh, atau cek `ML_API_BASE_URL` |
| Upload file gagal (413) | Naikkan `client_max_body_size` (Nginx) / `UPLOAD_MAX_BYTES` |
| Backend Render lambat saat awal | Plan Free "tidur" saat idle — normal; upgrade plan untuk selalu aktif |
| 404 saat refresh halaman (VPS) | Pastikan blok `try_files ... /index.html` ada di Nginx (SPA fallback) |
