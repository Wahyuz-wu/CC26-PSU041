-- Skema tabel untuk persistensi ringkasan analisis Foreca.
-- Jalankan di Supabase SQL Editor (project kamu) sebelum mengaktifkan
-- SUPABASE_URL & SUPABASE_SERVICE_KEY di backend/.env.
--
-- Catatan privasi: tabel ini HANYA menyimpan ringkasan hasil analisis,
-- BUKAN data mentah penjualan yang diupload pengguna.

create table if not exists public.analyses (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  n_days         integer,
  date_from      date,
  date_to        date,
  forecast_total numeric,
  model_version  text,
  insights       jsonb default '[]'::jsonb,
  forecast       jsonb default '[]'::jsonb
);

-- Index untuk query histori terbaru.
create index if not exists analyses_created_at_idx
  on public.analyses (created_at desc);

-- Opsional: aktifkan Row Level Security bila memakai anon key dari client.
-- Karena backend memakai SERVICE_KEY (server-side), RLS bisa dibiarkan
-- nonaktif. Jika diaktifkan, tambahkan policy sesuai kebutuhan:
--
-- alter table public.analyses enable row level security;
-- create policy "service role full access"
--   on public.analyses for all
--   to service_role using (true) with check (true);
