-- ============================================================================
-- E-REKOM — CEK DATA "ANDI DEA" & KESEHATAN DATA (jalankan di Supabase SQL Editor)
-- ============================================================================
-- Cara pakai: buka Supabase Dashboard > SQL Editor > New query > paste seluruh
-- file ini > Run. Lihat hasil tiap blok pada panel Results (beri nama tab bila
-- perlu). Semua blok HANYA MEMBACA (SELECT) — aman dijalankan kapan saja.
-- ============================================================================


-- ============================================================================
-- [1] Cari "Andi Dea" di tabel profiles (akun tampil di platform: Kelola Pengguna)
-- ============================================================================
select 'PROFIL DI PLATFORM' as sumber,
       id, email, nama_lengkap, nik, no_hp, asal_instansi, role, created_at
from public.profiles
where nama_lengkap ilike '%andi dea%' or email ilike '%andideaulia%';


-- ============================================================================
-- [2] Cari "Andi Dea" di tabel auth.users (daftar akun mentah Supabase Auth)
--     -> jika muncul di sini TAPI TIDAK di blok [1], berarti profilnya hilang
-- ============================================================================
select 'AUTH.USERS (MENTAH)' as sumber,
       u.id, u.email,
       (u.email_confirmed_at is not null) as email_terkonfirmasi,
       u.created_at,
       (p.id is not null) as punya_profil_platform
from auth.users u
left join public.profiles p on p.id = u.id
where u.email ilike '%andideaulia%'
   or coalesce(u.raw_user_meta_data->>'nama_lengkap', '') ilike '%andi dea%';


-- ============================================================================
-- [3] Rekap SEMUA akun: auth.users vs profiles (deteksi akun yatim)
--     -> baris dengan punya_profil_platform = false tidak akan pernah tampil
--        di platform dan tidak bisa dipakai login
-- ============================================================================
select u.email,
       coalesce(u.raw_user_meta_data->>'nama_lengkap', '(tanpa nama)') as nama,
       (u.email_confirmed_at is not null) as email_terkonfirmasi,
       (p.id is not null) as punya_profil_platform,
       u.created_at
from auth.users u
left join public.profiles p on p.id = u.id
order by punya_profil_platform asc, u.created_at asc;


-- ============================================================================
-- [4] Rekap SEMUA pengajuan + nama pemohon (inilah yang tampil di platform)
--     -> bandingkan dengan jumlah baris pengajuan_rekom di Table Editor
-- ============================================================================
select pg.id,
       pr.nama_lengkap as pemohon,
       pr.email        as email_pemohon,
       j.nama_jenis,
       pg.judul_pengajuan,
       pg.status,
       pg.created_at,
       (pr.id is null)  as pemohon_hilang,
       (j.id is null)   as jenis_hilang
from public.pengajuan_rekom pg
left join public.profiles pr        on pr.id = pg.pemohon_id
left join public.master_jenis_rekom j  on j.id = pg.jenis_id
order by pg.created_at desc;


-- ============================================================================
-- [5] Deteksi dokumen pendukung yang "rusak" (path metode lama, isinya hilang)
--     -> penyebab gagal pratinjau dokumen di platform (404)
-- ============================================================================
select d.id,
       pr.nama_lengkap as pemohon,
       pg.judul_pengajuan,
       pg.status,
       d.nama_dokumen,
       d.file_url,
       d.ukuran
from public.dokumen_pendukung d
join public.pengajuan_rekom pg on pg.id = d.pengajuan_id
left join public.profiles pr   on pr.id = pg.pemohon_id
where d.file_url like '/api/files/%'
order by pg.created_at desc;


-- ============================================================================
-- [6] OPSIONAL — KEMBALIKAN pengajuan yang dokumennya rusak agar pemohon bisa
--     mengunggah ulang. HAPUS tanda "--" di bawah bila ingin menjalankannya.
--     Efek: status berubah menjadi "perlu_perbaikan" dan pemohon menerima
--     catatan untuk memperbaiki & mengunggah ulang berkas.
--     URUTAN PENTING: jalankan blok tracking DULU, baru blok update.
-- ============================================================================
-- (6a) Catat jejak ke timeline (dari status lama):
-- insert into public.tracking_status (pengajuan_id, dari_status, ke_status, oleh_user_id, catatan)
-- select pg.id, pg.status, 'perlu_perbaikan',
--        (select id from public.profiles where role = 'super_admin' limit 1),
--        'Dikembalikan otomatis: berkas pendukung perlu diunggah ulang.'
-- from public.pengajuan_rekom pg
-- where exists (
--   select 1 from public.dokumen_pendukung d
--   where d.pengajuan_id = pg.id and d.file_url like '/api/files/%'
-- );
--
-- (6b) Ubah statusnya:
-- update public.pengajuan_rekom pg
-- set status            = 'perlu_perbaikan',
--     catatan_verifikator = 'Berkas pendukung tidak tersimpan permanen karena
--     gangguan sistem saat diunggah. Mohon unggah ulang seluruh dokumen
--     persyaratan, kemudian ajukan kembali. Mohon maaf atas ketidaknyamanannya.',
--     updated_at        = now()
-- where exists (
--   select 1 from public.dokumen_pendukung d
--   where d.pengajuan_id = pg.id and d.file_url like '/api/files/%'
-- );
-- ============================================================================
