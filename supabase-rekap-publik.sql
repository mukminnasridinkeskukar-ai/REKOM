-- =============================================================
-- E-REKOM — Rekap publik untuk popup kartu statistik beranda
-- =============================================================
-- FUNGSI:
--   Kartu statistik beranda (Total Pengajuan, Surat Terbit,
--   Menunggu Verifikasi, Jenis Rekomendasi) kini BISA DIKLIK dan
--   menampilkan popup rincian. Data diambil lewat RPC publik ini.
--
--   Kolom yang dipaparkan HANYA data terbatas non-sensitif:
--     status, jenis, nama lengkap, program studi,
--     puskesmas tujuan, fakultas & universitas, tanggal dibuat.
--   NIK / nomor HP / alamat / email TIDAK ikut.
--
-- CARA PAKAI:
--   Supabase Dashboard -> SQL Editor -> New query ->
--   tempel SELURUH isi file ini -> RUN. Idempotent (aman diulang).
-- =============================================================

create or replace function public.rekom_rekap_publik()
returns table (
  status               text,
  jenis                text,
  nama_lengkap         text,
  program_studi        text,
  puskesmas_tujuan     text,
  fakultas_universitas text,
  dibuat_at            timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.status::text,
    coalesce(j.nama_jenis, '')::text,
    coalesce(
      nullif(p.data_form_jsonb->>'nama_lengkap', ''),
      nullif(pr.nama_lengkap, ''),
      ''
    )::text,
    coalesce(p.data_form_jsonb->>'program_studi', '')::text,
    coalesce(p.data_form_jsonb->>'puskesmas_tujuan', '')::text,
    coalesce(
      nullif(p.data_form_jsonb->>'fakultas_dan_universitas', ''),
      nullif(p.data_form_jsonb->>'universitas_tujuan', ''),
      nullif(p.data_form_jsonb->>'fakultas', ''),
      nullif(p.data_form_jsonb->>'universitas', ''),
      ''
    )::text,
    p.created_at
  from public.pengajuan_rekom p
  left join public.profiles pr on pr.id = p.pemohon_id
  left join public.master_jenis_rekom j on j.id = p.jenis_id
  order by p.created_at desc
  limit 500
$$;

-- Hanya jalur fungsi ini yang dibuka; tabel tetap dikunci RLS.
revoke all on function public.rekom_rekap_publik() from public;
grant execute on function public.rekom_rekap_publik() to anon, authenticated;
