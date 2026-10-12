-- =============================================================
-- E-REKOM — Perbaikan statistik beranda yang selalu 0
-- =============================================================
-- MASALAH:
--   Kartu statistik di beranda (Total Pengajuan, Surat Terbit,
--   Menunggu Verifikasi, Jenis Rekomendasi) selalu 0.
--   Penyebab: statistik dihitung server-side TANPA sesi login
--   (peran anon), sementara RLS tabel pengajuan_rekom tidak
--   mengizinkan anon membaca baris apa pun -> semua hitungan 0.
--
-- SOLUSI:
--   RPC security definer rekom_stats_publik() yang mengembalikan
--   HANYA angka agregat (tanpa data pribadi siapa pun), boleh
--   dipanggil anon & authenticated. Pola sama dengan
--   rekom_verifikasi_nik yang sudah berjalan.
--
-- CARA PAKAI:
--   Supabase Dashboard -> SQL Editor -> New query ->
--   tempel SELURUH isi file ini -> RUN. Idempotent (aman 1x saja).
-- =============================================================

create or replace function public.rekom_stats_publik()
returns table (
  total_pengajuan  bigint,
  diajukan         bigint,
  terbit           bigint,
  perlu_perbaikan  bigint,
  terbit_bulan_ini bigint,
  total_jenis      bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.pengajuan_rekom),
    (select count(*) from public.pengajuan_rekom where status = 'diajukan'),
    (select count(*) from public.pengajuan_rekom where status = 'terbit'),
    (select count(*) from public.pengajuan_rekom where status = 'perlu_perbaikan'),
    (select count(*) from public.pengajuan_rekom
       where status = 'terbit'
         and tgl_terbit >= date_trunc('month', now())),
    (select count(*) from public.master_jenis_rekom where is_active = true)
$$;

-- Hanya jalur fungsi ini yang dibuka; tabel tetap dikunci RLS.
revoke all on function public.rekom_stats_publik() from public;
grant execute on function public.rekom_stats_publik() to anon, authenticated;
