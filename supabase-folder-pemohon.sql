-- ============================================================================
-- E-REKOM — Penataan Storage Per-Folder Pemohon (bucket dokumen-rekom)
-- ============================================================================
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > paste SELURUH isi
-- file ini > Run. Aman dijalankan berulang (idempotent).
--
-- Struktur penyimpanan baru (diunggah oleh aplikasi):
--   dokumen-rekom/{Nama-Pemohon--id8}/{idPengajuan}/{timestamp}-{nama-berkas}
--   contoh: dokumen-rekom/Andi-Saputra-S.Kep--a1b2c3d4/8f2e.../1730000000-scan-ktp.pdf
--
-- Kebijakan keamanan baru:
--   * Pemohon hanya boleh MENGUNGGAH / MENGUBAH / MENGHAPUS berkas di
--     foldernya sendiri (folder berakhiran --8 digit pertama ID akunnya).
--   * Semua pengguna terautentikasi masih boleh MEMBACA (dibutuhkan verifikator
--     & pimpinan untuk memeriksa berkas melalui aplikasi).
--   * Super Admin boleh mengelola semua folder (migrasi & pemeliharaan).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PASTIKAN BUCKET ADA
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('dokumen-rekom', 'dokumen-rekom', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('rekom-terbit', 'rekom-terbit', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. KEBIJAKAN BARU BUCKET dokumen-rekom (per-folder pemohon)
--    Folder milik pemohon = segmen pertama berakhiran '--' + 8 karakter ID akun.
-- ---------------------------------------------------------------------------
drop policy if exists "storage: authenticated unggah dokumen" on storage.objects;
create policy "storage: unggah hanya di folder sendiri" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dokumen-rekom'
    and (
      public.my_role() = 'super_admin'
      or right(split_part(name, '/', 1), 10) = '--' || left(auth.uid()::text, 8)
    )
  );

drop policy if exists "storage: authenticated baca dokumen" on storage.objects;
create policy "storage: baca dokumen terautentikasi" on storage.objects
  for select to authenticated
  using (bucket_id = 'dokumen-rekom');

drop policy if exists "storage: authenticated hapus dokumen" on storage.objects;
create policy "storage: ubah hanya di folder sendiri" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'dokumen-rekom'
    and (
      public.my_role() = 'super_admin'
      or right(split_part(name, '/', 1), 10) = '--' || left(auth.uid()::text, 8)
    )
  );

create policy "storage: hapus folder sendiri / admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'dokumen-rekom'
    and (
      public.my_role() in ('super_admin', 'admin_tu')
      or right(split_part(name, '/', 1), 10) = '--' || left(auth.uid()::text, 8)
    )
  );

-- ---------------------------------------------------------------------------
-- 3. SUPER ADMIN BOLEH MENGUBAH CATATAN DOKUMEN (dibutuhkan migrasi berkas lama
--    ke folder pemohon yang dijalankan dari sisi aplikasi)
-- ---------------------------------------------------------------------------
drop policy if exists "dokumen: super_admin penuh" on public.dokumen_pendukung;
create policy "dokumen: super_admin penuh" on public.dokumen_pendukung
  for update to authenticated
  using (public.my_role() = 'super_admin') with check (true);

-- ---------------------------------------------------------------------------
-- 4. TINJAUAN ISI BUCKET (read-only) — lihat penataan folder saat ini
-- ---------------------------------------------------------------------------
select bucket_id,
       split_part(name, '/', 1) as folder,
       count(*) as jumlah_berkas
from storage.objects
where bucket_id = 'dokumen-rekom'
group by bucket_id, split_part(name, '/', 1)
order by folder;

-- ============ SELESAI — storage tertata per-folder pemohon ============
