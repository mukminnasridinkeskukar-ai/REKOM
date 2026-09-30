-- ============================================================================
-- E-REKOM — SETUP FOTO PROFIL (jalankan SEKALI di Supabase SQL Editor)
-- Membuat bucket publik "foto-profil" + kebijakan keamanannya.
-- ============================================================================

-- 1) Bucket publik untuk foto profil
insert into storage.buckets (id, name, public)
values ('foto-profil', 'foto-profil', true)
on conflict (id) do update set public = true;

-- 2) Kebijakan: pengguna login hanya boleh menulis di folder miliknya sendiri
--    (path file: {user_id}/avatar-<timestamp>.<ext>)

-- Unggah foto sendiri
drop policy if exists "foto-profil insert sendiri" on storage.objects;
create policy "foto-profil insert sendiri"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'foto-profil'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Ganti foto sendiri
drop policy if exists "foto-profil update sendiri" on storage.objects;
create policy "foto-profil update sendiri"
on storage.objects for update to authenticated
using (
  bucket_id = 'foto-profil'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Hapus foto sendiri
drop policy if exists "foto-profil delete sendiri" on storage.objects;
create policy "foto-profil delete sendiri"
on storage.objects for delete to authenticated
using (
  bucket_id = 'foto-profil'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Catatan: pembacaan foto tidak perlu policy karena bucket bersifat PUBLIC
-- (URL publik: /storage/v1/object/public/foto-profil/...).
