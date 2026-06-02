# Panduan Lengkap: Upload ke GitHub & Setup Supabase

Panduan langkah-demi-langkah yang sangat rinci untuk pemula. Ikuti berurutan.
Perintah ditulis untuk dijalankan **dari dalam folder `foreca-fullstack-react/`**
di Terminal (macOS/Linux) atau Git Bash / PowerShell (Windows).

---

# BAGIAN A — UPLOAD KE GITHUB

## A0. Cek prasyarat (sekali saja)

Buka terminal, jalankan satu per satu:

```bash
git --version
```
- Jika muncul nomor versi (mis. `git version 2.43.0`) → lanjut.
- Jika "command not found" → install Git dulu:
  - **Windows:** unduh dari https://git-scm.com/download/win lalu install (klik Next sampai selesai). Setelah itu pakai aplikasi **Git Bash**.
  - **macOS:** jalankan `xcode-select --install` lalu ikuti dialog.
  - **Linux (Ubuntu/Debian):** `sudo apt update && sudo apt install git -y`

Set identitas Git (sekali saja per komputer — pakai email akun GitHub kamu):

```bash
git config --global user.name "Nama Kamu"
git config --global user.email "email-kamu@contoh.com"
```

## A1. Buat akun & repository kosong di GitHub

1. Buka https://github.com dan login (atau Sign up bila belum punya akun).
2. Klik tombol **+** di pojok kanan atas → **New repository**.
3. Isi formulir:
   - **Repository name:** `foreca-fullstack-react`
   - **Description:** (opsional) "Aplikasi forecasting penjualan UMKM"
   - **Public** atau **Private** → pilih salah satu (Private = hanya kamu yang lihat).
   - **PENTING:** JANGAN centang "Add a README file", "Add .gitignore", maupun "Choose a license". Biarkan kosong supaya tidak bentrok dengan file lokal.
4. Klik **Create repository**.
5. Halaman berikutnya akan menampilkan URL repo. Salin URL HTTPS-nya, bentuknya:
   `https://github.com/USERNAME/foreca-fullstack-react.git`
   (ganti USERNAME dengan username GitHub kamu — catat URL ini untuk langkah A4).

## A2. Buat Personal Access Token (pengganti password)

GitHub tidak menerima password akun saat push lewat HTTPS — kamu butuh token.

1. Di GitHub, klik foto profil (kanan atas) → **Settings**.
2. Scroll paling bawah sidebar kiri → **Developer settings**.
3. **Personal access tokens** → **Tokens (classic)** → **Generate new token** → **Generate new token (classic)**.
4. Isi:
   - **Note:** `foreca-push`
   - **Expiration:** 90 days (atau sesuai selera)
   - **Select scopes:** centang **`repo`** (mencakup semua sub-itemnya).
5. Klik **Generate token**.
6. **SALIN token sekarang juga** (bentuknya `ghp_xxxxxxxx`) dan simpan sementara di tempat aman — token ini TIDAK akan ditampilkan lagi setelah kamu pindah halaman.

> Token inilah yang nanti kamu tempel saat diminta "Password" ketika push.

## A3. Inisialisasi Git di proyek & buat commit pertama

Masuk ke folder proyek lalu jalankan berurutan:

```bash
cd foreca-fullstack-react

git init
git add .
git status
```

Pada output `git status`, **periksa baik-baik**: pastikan TIDAK ada baris yang
menyebut `.env`, `node_modules/`, atau `dist/`. File-file itu sudah di-ignore.
Yang boleh muncul: `package.json`, folder `frontend/`, `backend/`, `ml-service/`,
`sample-data/`, file `.env.example`, `README.md`, dll.

> Jika `.env` SEMPAT muncul di daftar, JANGAN commit. Hentikan, beri tahu saya,
> atau jalankan `git rm --cached backend/.env` sebelum lanjut.

Lalu buat commit:

```bash
git commit -m "Initial commit: Foreca full-stack React"
```

## A4. Hubungkan ke GitHub & push

Ganti URL di bawah dengan URL repo kamu dari langkah A1:

```bash
git branch -M main
git remote add origin https://github.com/USERNAME/foreca-fullstack-react.git
git push -u origin main
```

Saat diminta kredensial:
- **Username:** username GitHub kamu.
- **Password:** TEMPEL **Personal Access Token** (`ghp_...`) dari langkah A2 — bukan password akun.
  (Di terminal, teks password tidak terlihat saat diketik/ditempel — itu normal.)

Jika berhasil, muncul output seperti `Writing objects: 100% ... main -> main`.
Buka kembali halaman repo di GitHub dan refresh → semua file sudah ada.

## A5. Update berikutnya (setiap kali ada perubahan)

Setelah ini, untuk mengunggah perubahan baru cukup:

```bash
git add .
git commit -m "Deskripsi singkat perubahan"
git push
```

### Alternatif super cepat (kalau punya GitHub CLI `gh`)
Jika `gh --version` jalan dan sudah `gh auth login`, langkah A1–A4 bisa diringkas:
```bash
cd foreca-fullstack-react
git init && git add . && git commit -m "Initial commit"
gh repo create foreca-fullstack-react --public --source=. --push
```

### Troubleshooting GitHub
| Pesan error | Penyebab & solusi |
|---|---|
| `remote origin already exists` | Sudah pernah `git remote add`. Perbaiki: `git remote set-url origin <URL>` |
| `Authentication failed` | Password salah → pakai **token** `ghp_...`, bukan password akun |
| `Updates were rejected` | Repo remote tidak kosong. Solusi: `git pull origin main --allow-unrelated-histories` lalu `git push` |
| `src refspec main does not match` | Belum ada commit. Jalankan dulu `git commit -m "..."` |
| File `.env` tampil di GitHub | Hapus dari tracking: `git rm --cached backend/.env` → commit → push |

---

# BAGIAN B — SETUP SUPABASE

Supabase **opsional**. Tanpa Supabase, aplikasi tetap berjalan penuh; bedanya
hasil analisis tidak disimpan (endpoint `/api/history` akan kosong). Yang
disimpan hanya **ringkasan** (rentang tanggal, total forecast, insight) —
BUKAN data mentah penjualan yang kamu upload.

## B1. Buat project Supabase

1. Buka https://supabase.com → **Start your project** / **Sign in** (bisa login pakai GitHub).
2. Setelah masuk dashboard → **New project**.
3. Isi:
   - **Name:** `foreca`
   - **Database Password:** buat password kuat → **SIMPAN** (dipakai bila akses DB langsung).
   - **Region:** pilih terdekat, mis. **Southeast Asia (Singapore)**.
4. Klik **Create new project**. Tunggu ±1–2 menit sampai status database "ready".

## B2. Buat tabel `analyses` lewat SQL Editor

1. Di sidebar kiri dashboard, klik ikon **SQL Editor**.
2. Klik **New query**.
3. Buka file `backend/supabase_schema.sql` di proyek, **salin seluruh isinya**, lalu
   tempel ke editor SQL. (Isinya membuat tabel `analyses` + index untuk histori.)
4. Klik tombol **Run** (atau Ctrl/Cmd + Enter).
5. Pastikan muncul "Success. No rows returned".
6. (Verifikasi) Klik **Table Editor** di sidebar → harus ada tabel **analyses**
   dengan kolom: `id, created_at, n_days, date_from, date_to, forecast_total,
   model_version, insights, forecast`.

## B3. Ambil Project URL & Secret Key

1. Sidebar kiri → ikon **Settings** (gerigi) → **API Keys**
   (atau klik tombol **Connect** di atas, lalu tab yang sesuai).
2. Catat dua nilai berikut:

   **(a) Project URL** — di bagian atas, bentuknya:
   ```
   https://abcdefghijklmnop.supabase.co
   ```

   **(b) Kunci server-side** — pilih SALAH SATU:
   - **Cara baru (disarankan):** di tab **API Keys**, bagian **Secret keys**.
     Jika belum ada, klik **Create new API key** → salin nilai `sb_secret_...`.
   - **Cara lama (legacy):** buka tab **Legacy API Keys** → salin nilai
     **`service_role`** (BUKAN `anon`). Bentuknya token JWT panjang `eyJ...`.

   > Keduanya sama-sama bekerja di backend ini. Backend memakai kunci ini secara
   > server-side untuk menulis ke tabel.

> ⚠️ Kunci secret / service_role punya AKSES PENUH ke database. Perlakukan seperti
> password. JANGAN pernah ditaruh di frontend, di-share publik, atau di-commit ke GitHub.

## B4. Isi konfigurasi di `backend/.env`

1. Jika file `backend/.env` belum ada, salin dari template:

   **macOS/Linux/Git Bash:**
   ```bash
   cp backend/.env.example backend/.env
   ```
   **Windows PowerShell:**
   ```powershell
   Copy-Item backend\.env.example backend\.env
   ```

2. Buka `backend/.env` dengan editor teks (VS Code, Notepad, dll), cari blok
   Supabase di bagian bawah, dan isi tiga baris ini dengan nilai dari B3:

   ```
   SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   SUPABASE_SERVICE_KEY=sb_secret_xxxxxxxxxxxxxxxx
   SUPABASE_TABLE=analyses
   ```
   (Jangan beri tanda kutip. Jangan ada spasi di sekitar tanda `=`.)

3. Simpan file.

> File `backend/.env` sudah otomatis di-ignore Git, jadi aman — tidak akan
> ikut ter-push ke GitHub.

## B5. Restart backend & verifikasi

1. Hentikan aplikasi bila sedang berjalan (`Ctrl + C`), lalu jalankan lagi:
   ```bash
   npm run dev
   ```
2. Buka di browser: **http://localhost:8080/api/health**
   Cari bagian:
   ```json
   "supabase": { "enabled": true }
   ```
   - `true`  → Supabase aktif. Lanjut.
   - `false` → env belum terbaca. Lihat troubleshooting di bawah.

3. Lakukan satu analisis lewat web (upload `sample-data/penjualan-contoh.csv`
   → Proses Data → halaman Hasil muncul).

4. Cek histori tersimpan: buka **http://localhost:8080/api/history** —
   harus muncul array berisi 1 ringkasan analisis.
   Atau buka **Table Editor → analyses** di dashboard Supabase → ada 1 baris baru.

### Troubleshooting Supabase
| Gejala | Penyebab & solusi |
|---|---|
| `"supabase":{"enabled":false}` | `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` kosong atau salah tempat. Pastikan di **backend/.env** (bukan `.env.example`, bukan frontend), tanpa kutip, lalu restart `npm run dev`. |
| `/api/history` error / 500 | Tabel belum dibuat. Ulangi B2 (jalankan `supabase_schema.sql`). |
| Data tidak tersimpan padahal enabled | Kunci `anon` salah dipakai. Gunakan **service_role** / **sb_secret**, bukan anon/publishable. |
| `relation "analyses" does not exist` | Nama tabel beda. Samakan `SUPABASE_TABLE` dengan nama tabel di SQL (default `analyses`). |
| Lupa restart | Perubahan `.env` hanya terbaca saat start. Hentikan (`Ctrl+C`) lalu `npm run dev` lagi. |

---

## Ringkasan keamanan (penting)

- `backend/.env` berisi rahasia → sudah di-ignore, jangan pernah di-commit.
- Kunci **service_role / sb_secret** hanya untuk **backend** (server-side).
  Jangan menaruhnya di variabel `VITE_*` atau di kode frontend — kunci itu akan
  ikut ter-bundle dan terlihat publik.
- Jika kunci pernah ter-commit/ter-share tak sengaja: di dashboard Supabase
  → **Settings → API Keys** → rotate/regenerate kunci tersebut.
