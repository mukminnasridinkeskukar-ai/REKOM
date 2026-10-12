-- ============================================================================
-- E-REKOM — Pemulihan Dashboard + Verifikasi Keaslian via NIK
-- ============================================================================
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > paste SELURUH isi
-- file ini > Run. Aman dijalankan berulang (idempotent).
--
-- Yang dilakukan file ini:
--   1. MEMPERBAIKI role/bidang akun uji standar yang tertukar di database
--      (penyebab dashboard menampilkan 0 — akun terbaca sebagai pemohon
--      sehingga RLS hanya menampilkan miliknya sendiri).
--   2. RPC rekom_verifikasi_nik(nik) — verifikasi publik surat TERBIT via
--      NIK pemohon (tanpa login), dipakai halaman /verifikasi tab "NIK".
--   3. RPC rekom_berkas_nik(id, nik) — path berkas surat terbit untuk
--      unduhan publik via /api/rekom-terbit/{id}?nik={nik}.
--   4. Tinjauan: daftar profil & role, rekap status pengajuan, cek RPC.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PERBAIKI AKUN UJI STANDAR (role & bidang sesuai desain)
--    Cocokkan lewat email auth (bukan kolom email di profiles) agar tetap
--    benar walau kolom email di profiles berbeda/kosong.
-- ---------------------------------------------------------------------------
update public.profiles pr
set role = 'pemohon', bidang = null, nama_lengkap = 'Pemohon Uji Dinkes', updated_at = now()
from auth.users au
where au.id = pr.id and lower(coalesce(au.email, '')) = 'pemohon@dinkes.go.id';

update public.profiles pr
set role = 'verifikator_bidang', bidang = 'SDMK', nama_lengkap = 'Verifikator SDMK', updated_at = now()
from auth.users au
where au.id = pr.id and lower(coalesce(au.email, '')) = 'verifikator.sdmk@dinkes.go.id';

update public.profiles pr
set role = 'verifikator_bidang', bidang = 'Yankes', nama_lengkap = 'Verifikator Yankes', updated_at = now()
from auth.users au
where au.id = pr.id and lower(coalesce(au.email, '')) = 'verifikator.yankes@dinkes.go.id';

update public.profiles pr
set role = 'verifikator_bidang', bidang = 'Farmalkes', nama_lengkap = 'Verifikator Farmalkes', updated_at = now()
from auth.users au
where au.id = pr.id and lower(coalesce(au.email, '')) = 'verifikator.farmalkes@dinkes.go.id';

update public.profiles pr
set role = 'admin_tu', bidang = null, nama_lengkap = 'Admin Tata Usaha', updated_at = now()
from auth.users au
where au.id = pr.id and lower(coalesce(au.email, '')) = 'admin.tu@dinkes.go.id';

update public.profiles pr
set role = 'kabid', bidang = null, nama_lengkap = 'Kabid Uji', updated_at = now()
from auth.users au
where au.id = pr.id and lower(coalesce(au.email, '')) = 'kabid@dinkes.go.id';

update public.profiles pr
set role = 'kadis', bidang = null, nama_lengkap = 'Kepala Dinas Uji', updated_at = now()
from auth.users au
where au.id = pr.id and lower(coalesce(au.email, '')) = 'kadis@dinkes.go.id';

update public.profiles pr
set role = 'super_admin', bidang = null, nama_lengkap = 'Super Admin Uji', updated_at = now()
from auth.users au
where au.id = pr.id and lower(coalesce(au.email, '')) = 'superadmin@dinkes.go.id';

-- ---------------------------------------------------------------------------
-- 2. RPC VERIFIKASI PUBLIK VIA NIK (tanpa login)
--    Mengembalikan daftar surat berstatus TERBIT milik pemohon dengan NIK
--    tersebut. Hanya data aman untuk publik; berkas diambil lewat RPC no. 3.
-- ---------------------------------------------------------------------------
create or replace function public.rekom_verifikasi_nik(p_nik text)
returns table (
  pengajuan_id    uuid,
  nomor_surat     text,
  jenis_nama      text,
  judul_pengajuan text,
  pemohon_nama    text,
  asal_instansi   text,
  tgl_terbit      timestamptz,
  nama_kadis      text,
  ada_berkas      boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         p.nomor_surat,
         j.nama_jenis,
         p.judul_pengajuan,
         pr.nama_lengkap,
         pr.asal_instansi,
         p.tgl_terbit,
         (select pk.nama_lengkap
            from public.profiles pk
           where pk.role = 'kadis'
           order by pk.created_at asc
           limit 1),
         (p.file_rekom_pdf_url is not null and btrim(p.file_rekom_pdf_url) <> '')
  from public.pengajuan_rekom p
  join public.master_jenis_rekom j on j.id = p.jenis_id
  join public.profiles pr on pr.id = p.pemohon_id
  where p.status = 'terbit'
    and pr.nik = regexp_replace(coalesce(p_nik, ''), '\D', '', 'g')
    and length(regexp_replace(coalesce(p_nik, ''), '\D', '', 'g')) = 16
  order by p.tgl_terbit desc nulls last
  limit 50;
$$;

revoke all on function public.rekom_verifikasi_nik(text) from public;
grant execute on function public.rekom_verifikasi_nik(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. RPC UNDUH BERKAS VIA NIK (untuk /api/rekom-terbit/{id}?nik={nik})
--    Mengembalikan path berkas di bucket "rekom-terbit" HANYA bila id
--    pengajuan + NIK pemohon cocok dan statusnya TERBIT.
-- ---------------------------------------------------------------------------
create or replace function public.rekom_berkas_nik(p_id uuid, p_nik text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.file_rekom_pdf_url
  from public.pengajuan_rekom p
  join public.profiles pr on pr.id = p.pemohon_id
  where p.id = p_id
    and p.status = 'terbit'
    and p.file_rekom_pdf_url is not null
    and btrim(p.file_rekom_pdf_url) <> ''
    and pr.nik = regexp_replace(coalesce(p_nik, ''), '\D', '', 'g')
    and length(regexp_replace(coalesce(p_nik, ''), '\D', '', 'g')) = 16
  limit 1;
$$;

revoke all on function public.rekom_berkas_nik(uuid, text) from public;
grant execute on function public.rekom_berkas_nik(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. TINJAUAN (hasil muncul di panel hasil SQL Editor)
-- ---------------------------------------------------------------------------

-- 4a. Profil & role — pastikan akun uji sudah benar
select au.email, pr.nama_lengkap, pr.role, pr.bidang
from public.profiles pr
join auth.users au on au.id = pr.id
order by pr.role, pr.nama_lengkap;

-- 4b. Rekap pengajuan per status — pastikan datanya ADA (dashboard tidak 0 lagi)
select status, count(*) as jumlah
from public.pengajuan_rekom
group by status
order by jumlah desc;

-- 4c. RPC baru aktif
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('rekom_verifikasi_nik', 'rekom_berkas_nik', 'rekom_berkas_publik')
order by routine_name;

-- ============ SELESAI — dashboard pulih & verifikasi NIK aktif ============
