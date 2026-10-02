-- ============================================================================
-- E-REKOM — Berkas Surat Terbit dari Folder Storage "rekom-terbit"
-- ============================================================================
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > paste SELURUH isi
-- file ini > Run. Aman dijalankan berulang (idempotent).
--
-- Fitur:
--   * Saat Kepala Dinas menekan "Tanda Tangan & Terbitkan", aplikasi meminta
--     berkas surat hasil tanda tangan (scan/PDF) dari bucket "rekom-terbit".
--   * Berkas itulah yang tampil & dapat diunduh di akun pemohon, serta
--     dibuka dari halaman verifikasi QR.
--   * Berkas boleh diunggah lewat aplikasi (dialog terbitkan) ATAU manual via
--     Supabase Dashboard > Storage > rekom-terbit (lalu dipilih saat terbit).
--
-- Kebijakan yang ditambahkan:
--   1. Staf (Kadis, Admin TU, Super Admin) boleh mengunggah / mengubah /
--      menghapus berkas di bucket "rekom-terbit".
--   2. Semua pengguna terautentikasi boleh melihat/mendaftar berkas
--      (dibutuhkan dialog pilih berkas & pratinjau).
--   3. RPC rekom_berkas_publik(qr) — agar pemindai QR publik (tanpa login)
--      dapat membuka berkas surat yang sah tanpa membocorkan data lain.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PASTIKAN BUCKET rekom-terbit ADA
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('rekom-terbit', 'rekom-terbit', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. KEBIJAKAN STORAGE bucket rekom-terbit
-- ---------------------------------------------------------------------------
drop policy if exists "storage: staf kelola rekom-terbit (insert)" on storage.objects;
create policy "storage: staf kelola rekom-terbit (insert)" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'rekom-terbit'
    and public.my_role() in ('super_admin', 'admin_tu', 'kadis')
  );

drop policy if exists "storage: staf kelola rekom-terbit (update)" on storage.objects;
create policy "storage: staf kelola rekom-terbit (update)" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'rekom-terbit'
    and public.my_role() in ('super_admin', 'admin_tu', 'kadis')
  )
  with check (
    bucket_id = 'rekom-terbit'
    and public.my_role() in ('super_admin', 'admin_tu', 'kadis')
  );

drop policy if exists "storage: staf kelola rekom-terbit (delete)" on storage.objects;
create policy "storage: staf kelola rekom-terbit (delete)" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'rekom-terbit'
    and public.my_role() in ('super_admin', 'admin_tu', 'kadis')
  );

drop policy if exists "storage: baca rekom-terbit (authenticated)" on storage.objects;
create policy "storage: baca rekom-terbit (authenticated)" on storage.objects
  for select to authenticated
  using (bucket_id = 'rekom-terbit');

-- ---------------------------------------------------------------------------
-- 3. RPC UNTUK AKSES QR PUBLIK (tanpa login)
--    Mengembalikan path berkas surat terbit HANYA bila kode QR cocok dengan
--    pengajuan berstatus terbit. Dipakai route /api/rekom-terbit/{id}?qr=...
-- ---------------------------------------------------------------------------
create or replace function public.rekom_berkas_publik(p_qr text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select file_rekom_pdf_url
  from public.pengajuan_rekom
  where qr_code_id::text = p_qr
    and status = 'terbit'
    and file_rekom_pdf_url is not null
  limit 1;
$$;

grant execute on function public.rekom_berkas_publik(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. TINJAUAN — pastikan kebijakan aktif
-- ---------------------------------------------------------------------------
select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like '%rekom-terbit%'
order by policyname;

select routine_name
from information_schema.routines
where routine_schema = 'public' and routine_name = 'rekom_berkas_publik';

-- ============ SELESAI — surat terbit kini bersumber dari rekom-terbit ============
