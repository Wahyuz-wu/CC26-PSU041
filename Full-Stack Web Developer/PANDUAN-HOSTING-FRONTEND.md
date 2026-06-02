# Rekomendasi Hosting Frontend: GitHub Pages vs Netlify vs Vercel

## ⚠️ Baca ini dulu (penting)

Ketiga layanan ini **hanya meng-host FRONTEND** (file statis hasil `vite build`).
Mereka **TIDAK bisa menjalankan backend Express** kamu (yang memproses upload
file & memanggil ML). Jadi arsitektur deploy-nya:

```
[GitHub Pages / Netlify / Vercel]      [Render / Koyeb / dll]      [Hugging Face]
        FRONTEND (statis)        ──►       BACKEND (Express)   ──►   ML (sudah online)
```

Artinya: deploy backend dulu (lihat PANDUAN-DEPLOYMENT.md), catat URL-nya, baru
deploy frontend ke salah satu layanan di bawah dengan mengarahkan
`VITE_API_BASE_URL` ke URL backend tersebut.

> Kabar baik: frontend ini memakai **HashRouter** (URL `#/dashboard`), jadi TIDAK
> ada masalah "404 saat refresh" di host statis mana pun — termasuk GitHub Pages.

## Ringkasan rekomendasi

| Kriteria | GitHub Pages | Netlify | **Vercel** |
|---|---|---|---|
| Kemudahan setup | Sedang (perlu config base) | Mudah | **Paling mudah** |
| Tanpa kartu kredit | ✅ | ✅ | ✅ |
| Auto-deploy dari Git | ✅ (via Actions) | ✅ | ✅ |
| Set env var saat build | ❌ (perlu trik) | ✅ | ✅ |
| Subfolder `frontend/` | perlu Actions | ✅ (base directory) | ✅ (root directory) |
| Cocok untuk proyek ini | Bisa | Bagus | **Paling pas** |

**Rekomendasi: Vercel** — paling sederhana untuk Vite + React di subfolder, dan
mendukung environment variable (`VITE_API_BASE_URL`) langsung di UI. Netlify
setara dan sama bagusnya. GitHub Pages bisa, tapi agak ribet karena (a) butuh
mengatur `base` path dan (b) tidak punya UI env var sehingga URL backend harus
ditanam manual.

Pilih SALAH SATU bagian di bawah.

---

# OPSI 1 — VERCEL (rekomendasi utama)

### 1.1 Prasyarat
- Kode sudah di GitHub.
- URL backend sudah diketahui, mis. `https://foreca-backend.onrender.com`.

### 1.2 Import proyek
1. Buka https://vercel.com → **Sign up / Log in** (pakai akun GitHub).
2. **Add New...** → **Project**.
3. Pilih repo `foreca-fullstack-react` → **Import**.

### 1.3 Konfigurasi build (PENTING: subfolder)
- **Framework Preset:** Vite (otomatis terdeteksi).
- **Root Directory:** klik **Edit** → pilih folder **`frontend`**.
- **Build Command:** `npm run build` (default).
- **Output Directory:** `dist` (default).

### 1.4 Environment Variable (WAJIB sebelum Deploy)
Buka bagian **Environment Variables**, tambahkan:

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://foreca-backend.onrender.com` |

(Tanpa garis miring di akhir. Variabel `VITE_*` ditanam saat build, jadi harus
diisi sebelum klik Deploy. Jika diubah nanti → **Redeploy**.)

### 1.5 Deploy & verifikasi
1. Klik **Deploy**, tunggu selesai.
2. Catat URL, mis. `https://foreca-xxxx.vercel.app`.
3. Buka URL itu → uji alur Upload → Proses → Hasil.

### 1.6 Lengkapi CORS di backend
Di dashboard backend (Render) → Environment → set
`CORS_ALLOW_ORIGINS=https://foreca-xxxx.vercel.app` → Save (backend redeploy).

> Catatan lisensi: plan **Hobby Vercel gratis hanya untuk non-komersial**. Untuk
> tugas kuliah/portofolio aman; untuk produk komersial gunakan plan Pro.

---

# OPSI 2 — NETLIFY

### 2.1 Import proyek
1. Buka https://app.netlify.com → **Sign up / Log in** (pakai GitHub).
2. **Add new site** → **Import an existing project** → **Deploy with GitHub**.
3. Pilih repo `foreca-fullstack-react`.

### 2.2 Konfigurasi build (subfolder)
- **Base directory:** `frontend`
- **Build command:** `npm run build`
- **Publish directory:** `frontend/dist`
  (Jika "Base directory" sudah diisi `frontend`, cukup tulis `dist`.)

### 2.3 Environment Variable
Sebelum deploy, klik **Add environment variables** (atau nanti di
Site configuration → Environment variables):

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://foreca-backend.onrender.com` |

### 2.4 (Opsional) File konfigurasi di repo
Agar setting tersimpan di kode, buat file `frontend/netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"
```

### 2.5 Deploy & verifikasi
1. Klik **Deploy**. Tunggu selesai.
2. Catat URL, mis. `https://foreca-xxxx.netlify.app`. Uji alur penuh.
3. Set `CORS_ALLOW_ORIGINS` di backend = URL Netlify → redeploy backend.

> Catatan: Netlify kini memakai model berbasis kredit (kuota bulanan). Untuk
> situs statis ringan seperti ini, kuota gratisnya cukup.

---

# OPSI 3 — GITHUB PAGES (gratis, tapi paling teknis)

GitHub Pages menyajikan situs di `https://USERNAME.github.io/foreca-fullstack-react/`
(ada subpath nama-repo). Karena itu butuh 2 penyesuaian: set `base` di Vite, dan
tanam URL backend saat build (Pages tidak punya UI env var).

### 3.1 Set `base` path di Vite
Edit `frontend/vite.config.js` menjadi:
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Nama persis repository GitHub kamu, diapit garis miring:
  base: '/foreca-fullstack-react/',
});
```
> Jika nanti dipasang di custom domain atau di `USERNAME.github.io` (tanpa
> subpath), ubah `base` menjadi `'/'`.

### 3.2 Buat workflow GitHub Actions
Karena frontend ada di subfolder dan butuh build, kita pakai Actions.
Buat file `.github/workflows/deploy-pages.yml` (di ROOT repo):

```yaml
name: Deploy frontend to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
        env:
          # URL backend ditanam saat build:
          VITE_API_BASE_URL: https://foreca-backend.onrender.com
      - uses: actions/upload-pages-artifact@v3
        with:
          path: frontend/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

> Ganti `https://foreca-backend.onrender.com` dengan URL backend kamu.

### 3.3 Aktifkan Pages
1. Commit & push kedua file di atas:
   ```bash
   git add frontend/vite.config.js .github/workflows/deploy-pages.yml
   git commit -m "Setup GitHub Pages deploy"
   git push
   ```
2. Di repo GitHub → **Settings** → **Pages** → bagian **Build and deployment** →
   **Source:** pilih **GitHub Actions**.
3. Buka tab **Actions** → tunggu workflow "Deploy frontend to GitHub Pages" selesai (hijau).
4. URL situs muncul di Settings → Pages, mis.
   `https://USERNAME.github.io/foreca-fullstack-react/`

### 3.4 Verifikasi & CORS
1. Buka URL Pages → uji Upload → Proses → Hasil.
2. Set di backend: `CORS_ALLOW_ORIGINS=https://USERNAME.github.io`
   (cukup origin-nya: skema + host, TANPA path repo) → redeploy backend.

---

# Checklist umum (berlaku untuk ketiga opsi)
- [ ] Backend sudah live & `\/api\/health` → `status:ok`
- [ ] `VITE_API_BASE_URL` menunjuk URL backend yang benar (tanpa `/` di akhir)
- [ ] (GitHub Pages) `base` di vite.config.js = `/nama-repo/`
- [ ] Frontend live; alur Upload → Proses → Hasil berhasil
- [ ] `CORS_ALLOW_ORIGINS` backend berisi origin frontend (persis, dengan https)
- [ ] Untuk update: cukup `git push` (ketiganya auto-redeploy)

# Troubleshooting
| Gejala | Penyebab & solusi |
|---|---|
| Halaman putih / aset 404 (GitHub Pages) | `base` salah. Samakan dengan `/nama-repo/` persis |
| Analisis gagal, error CORS di Console | `CORS_ALLOW_ORIGINS` belum berisi origin frontend |
| Analisis gagal, request ke localhost:8080 | `VITE_API_BASE_URL` belum di-set / belum redeploy |
| Ubah env tapi tak berubah | Env `VITE_*` ditanam saat build → trigger Redeploy |
| Backend lambat di request pertama | Cold start Render Free (normal, ~30–60 dtk) |
