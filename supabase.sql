-- ============================================================================
-- E-REKOM — Tata Kelola Rekomendasi Kepala Dinas Kesehatan
--           Kabupaten Kutai Kartanegara
-- ============================================================================
-- Skema lengkap untuk Supabase (Postgres + Auth + Storage + Realtime + RLS).
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > paste seluruh file > Run.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. TABEL: PROFILES
-- ============================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  nama_lengkap  text not null,
  nik           text,
  no_hp         text,
  asal_instansi text,
  jabatan       text,
  role          text not null default 'pemohon'
                check (role in ('pemohon','verifikator_bidang','admin_tu','kabid','kadis','super_admin')),
  bidang        text check (bidang in ('SDMK','Yankes','Farmalkes','Sekretariat') or bidang is null),
  foto_url      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Profil pengguna; 1:1 dengan auth.users.';

-- ============================================================================
-- 2. TABEL: MASTER JENIS REKOMENDASI (fleksibel — admin bisa tambah tanpa coding)
-- ============================================================================
create table if not exists public.master_jenis_rekom (
  id               uuid primary key default gen_random_uuid(),
  kode_jenis       text not null unique,
  nama_jenis       text not null,
  deskripsi        text,
  icon             text not null default 'FileText',
  warna            text not null default '#0F766E',
  bidang           text not null default 'Sekretariat'
                   check (bidang in ('SDMK','Yankes','Farmalkes','Sekretariat')),
  persyaratan_json jsonb not null default '{"fields":[],"dokumen":[]}',
  template_nomor   text not null default '440/{seq}/{kode}/Dinkes-Kukar/{year}',
  template_surat   text,
  is_active        boolean not null default true,
  urutan           int not null default 99,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column public.master_jenis_rekom.persyaratan_json is
  '{"fields":[{"key","label","type":"text|textarea|number|date|select","required",options[]}], "dokumen":[{"nama","required"}]}';

-- ============================================================================
-- 3. TABEL: PENGAJUAN REKOMENDASI
-- ============================================================================
create table if not exists public.pengajuan_rekom (
  id                  uuid primary key default gen_random_uuid(),
  pemohon_id          uuid not null references public.profiles (id) on delete cascade,
  jenis_id            uuid not null references public.master_jenis_rekom (id),
  judul_pengajuan     text not null,
  data_form_jsonb     jsonb not null default '{}'::jsonb,
  status              text not null default 'draft'
                      check (status in (
                        'draft','diajukan','diverifikasi_bidang','perlu_perbaikan',
                        'disetujui_kabid','menunggu_ttd_kadis','terbit','ditolak'
                      )),
  catatan_verifikator text,
  nomor_surat         text unique,
  tgl_terbit          timestamptz,
  file_rekom_pdf_url  text,
  qr_code_id          uuid unique default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_pengajuan_pemohon on public.pengajuan_rekom (pemohon_id);
create index if not exists idx_pengajuan_jenis on public.pengajuan_rekom (jenis_id);
create index if not exists idx_pengajuan_status on public.pengajuan_rekom (status);
create index if not exists idx_pengajuan_qr on public.pengajuan_rekom (qr_code_id);

-- ============================================================================
-- 4. TABEL: DOKUMEN PENDUKUNG
-- ============================================================================
create table if not exists public.dokumen_pendukung (
  id           uuid primary key default gen_random_uuid(),
  pengajuan_id uuid not null references public.pengajuan_rekom (id) on delete cascade,
  nama_dokumen text not null,
  file_url     text not null,           -- path di bucket Storage "dokumen-rekom"
  tipe_file    text not null default 'application/octet-stream',
  ukuran       bigint not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_dokumen_pengajuan on public.dokumen_pendukung (pengajuan_id);

-- ============================================================================
-- 5. TABEL: TRACKING STATUS
-- ============================================================================
create table if not exists public.tracking_status (
  id           uuid primary key default gen_random_uuid(),
  pengajuan_id uuid not null references public.pengajuan_rekom (id) on delete cascade,
  dari_status  text,
  ke_status    text not null,
  oleh_user_id uuid references public.profiles (id) on delete set null,
  catatan      text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_tracking_pengajuan on public.tracking_status (pengajuan_id);

-- ============================================================================
-- 6. TABEL: NOTIFIKASI (realtime)
-- ============================================================================
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  pengajuan_id uuid references public.pengajuan_rekom (id) on delete cascade,
  judul        text not null,
  pesan        text not null,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists idx_notif_user on public.notifications (user_id);

-- ============================================================================
-- 7. TRIGGER: updated_at otomatis
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_jenis_updated on public.master_jenis_rekom;
create trigger trg_jenis_updated before update on public.master_jenis_rekom
  for each row execute function public.set_updated_at();

drop trigger if exists trg_pengajuan_updated on public.pengajuan_rekom;
create trigger trg_pengajuan_updated before update on public.pengajuan_rekom
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 8. TRIGGER: buat profile otomatis saat user mendaftar (auth.users -> profiles)
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nama_lengkap, nik, no_hp, asal_instansi, jabatan, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nama_lengkap', split_part(coalesce(new.email, 'Pemohon'), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'nik', ''),
    nullif(new.raw_user_meta_data ->> 'no_hp', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'asal_instansi', ''), 'Pemohon'),
    nullif(new.raw_user_meta_data ->> 'jabatan', ''),
    'pemohon' -- role default; Super Admin dapat mengubahnya dari menu Kelola Pengguna
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 9. FUNGSI BANTU RLS (security definer agar tidak rekursif pada profiles)
-- ============================================================================
create or replace function public.my_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.my_bidang()
returns text
language sql stable security definer set search_path = public
as $$
  select bidang from public.profiles where id = auth.uid();
$$;

-- boleh melihat pengajuan? (pemilik / verifikator bidang / manajemen)
create or replace function public.can_view_pengajuan(p_pengajuan_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.pengajuan_rekom p
    join public.master_jenis_rekom j on j.id = p.jenis_id
    where p.id = p_pengajuan_id
      and (
        p.pemohon_id = auth.uid()
        or (public.my_role() = 'verifikator_bidang' and j.bidang = public.my_bidang())
        or public.my_role() in ('admin_tu','kabid','kadis','super_admin')
      )
  );
$$;

-- ============================================================================
-- 10. RPC: GENERATE NOMOR SURAT (format: 440/{seq}/{kode}/Dinkes-Kukar/{year})
-- ============================================================================
create or replace function public.generate_nomor_surat(p_jenis_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kode     text;
  v_template text;
  v_seq      int;
  v_year     int := extract(year from now())::int;
begin
  select kode_jenis, template_nomor into v_kode, v_template
  from public.master_jenis_rekom where id = p_jenis_id;
  if v_kode is null then
    raise exception 'Jenis rekomendasi tidak ditemukan';
  end if;

  select count(*) + 1 into v_seq
  from public.pengajuan_rekom
  where jenis_id = p_jenis_id
    and nomor_surat is not null
    and extract(year from coalesce(tgl_terbit, created_at))::int = v_year;

  return replace(replace(replace(v_template,
    '{seq}',  lpad(v_seq::text, 3, '0')),
    '{kode}', v_kode),
    '{year}', v_year::text);
end;
$$;

-- ============================================================================
-- 11. RPC: VERIFIKASI PUBLIK VIA QR (tanpa login — hanya data aman)
-- ============================================================================
create or replace function public.verify_surat_public(p_qr text)
returns table (
  nomor_surat     text,
  jenis_nama      text,
  judul_pengajuan text,
  pemohon_nama    text,
  asal_instansi   text,
  tgl_terbit      timestamptz,
  nama_kadis      text,
  pengajuan_id    uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select p.nomor_surat,
         j.nama_jenis,
         p.judul_pengajuan,
         pr.nama_lengkap,
         pr.asal_instansi,
         p.tgl_terbit,
         (select pk.nama_lengkap from public.profiles pk where pk.role = 'kadis' limit 1) as nama_kadis,
         p.id
  from public.pengajuan_rekom p
  join public.master_jenis_rekom j on j.id = p.jenis_id
  join public.profiles pr on pr.id = p.pemohon_id
  where p.qr_code_id::text = p_qr
    and p.status = 'terbit';
end;
$$;

-- ============================================================================
-- 12. ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles           enable row level security;
alter table public.master_jenis_rekom enable row level security;
alter table public.pengajuan_rekom    enable row level security;
alter table public.dokumen_pendukung  enable row level security;
alter table public.tracking_status    enable row level security;
alter table public.notifications      enable row level security;

-- ---- profiles ----
drop policy if exists "profiles: lihat sendiri" on public.profiles;
create policy "profiles: lihat sendiri" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles: lihat kolega sesama pegawai" on public.profiles;
create policy "profiles: lihat kolega sesama pegawai" on public.profiles
  for select to authenticated
  using (public.my_role() in ('verifikator_bidang','admin_tu','kabid','kadis','super_admin'));

drop policy if exists "profiles: perbarui sendiri" on public.profiles;
create policy "profiles: perbarui sendiri" on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role());

drop policy if exists "profiles: super_admin kelola" on public.profiles;
create policy "profiles: super_admin kelola" on public.profiles
  for update to authenticated
  using (public.my_role() = 'super_admin')
  with check (public.my_role() = 'super_admin');

drop policy if exists "profiles: insert sendiri" on public.profiles;
create policy "profiles: insert sendiri" on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- ---- master_jenis_rekom ----
drop policy if exists "jenis: semua terautentikasi boleh baca" on public.master_jenis_rekom;
create policy "jenis: semua terautentikasi boleh baca" on public.master_jenis_rekom
  for select to authenticated using (true);

drop policy if exists "jenis: super_admin tulis" on public.master_jenis_rekom;
create policy "jenis: super_admin tulis" on public.master_jenis_rekom
  for all to authenticated
  using (public.my_role() = 'super_admin')
  with check (public.my_role() = 'super_admin');

-- ---- pengajuan_rekom: SELECT ----
drop policy if exists "pengajuan: pemohon lihat miliknya" on public.pengajuan_rekom;
create policy "pengajuan: pemohon lihat miliknya" on public.pengajuan_rekom
  for select to authenticated using (pemohon_id = auth.uid());

drop policy if exists "pengajuan: verifikator lihat bidangnya" on public.pengajuan_rekom;
create policy "pengajuan: verifikator lihat bidangnya" on public.pengajuan_rekom
  for select to authenticated
  using (
    public.my_role() = 'verifikator_bidang'
    and exists (
      select 1 from public.master_jenis_rekom j
      where j.id = jenis_id and j.bidang = public.my_bidang()
    )
  );

drop policy if exists "pengajuan: manajemen lihat semua" on public.pengajuan_rekom;
create policy "pengajuan: manajemen lihat semua" on public.pengajuan_rekom
  for select to authenticated
  using (public.my_role() in ('admin_tu','kabid','kadis','super_admin'));

-- ---- pengajuan_rekom: INSERT ----
drop policy if exists "pengajuan: pemohon buat miliknya" on public.pengajuan_rekom;
create policy "pengajuan: pemohon buat miliknya" on public.pengajuan_rekom
  for insert to authenticated with check (pemohon_id = auth.uid());

-- ---- pengajuan_rekom: UPDATE ----
drop policy if exists "pengajuan: pemohon sunting miliknya" on public.pengajuan_rekom;
create policy "pengajuan: pemohon sunting miliknya" on public.pengajuan_rekom
  for update to authenticated
  using (pemohon_id = auth.uid() and status in ('draft','perlu_perbaikan'))
  with check (pemohon_id = auth.uid());

drop policy if exists "pengajuan: verifikator proses bidangnya" on public.pengajuan_rekom;
create policy "pengajuan: verifikator proses bidangnya" on public.pengajuan_rekom
  for update to authenticated
  using (
    public.my_role() = 'verifikator_bidang'
    and exists (
      select 1 from public.master_jenis_rekom j
      where j.id = jenis_id and j.bidang = public.my_bidang()
    )
  )
  with check (true);

drop policy if exists "pengajuan: kabid menyetujui" on public.pengajuan_rekom;
create policy "pengajuan: kabid menyetujui" on public.pengajuan_rekom
  for update to authenticated
  using (public.my_role() = 'kabid') with check (true);

drop policy if exists "pengajuan: admin_tu penomoran" on public.pengajuan_rekom;
create policy "pengajuan: admin_tu penomoran" on public.pengajuan_rekom
  for update to authenticated
  using (public.my_role() = 'admin_tu') with check (true);

drop policy if exists "pengajuan: kadis pengesahan" on public.pengajuan_rekom;
create policy "pengajuan: kadis pengesahan" on public.pengajuan_rekom
  for update to authenticated
  using (public.my_role() = 'kadis') with check (true);

drop policy if exists "pengajuan: super_admin penuh" on public.pengajuan_rekom;
create policy "pengajuan: super_admin penuh" on public.pengajuan_rekom
  for update to authenticated
  using (public.my_role() = 'super_admin') with check (true);

-- ---- dokumen_pendukung (mengikuti akses pengajuan induknya) ----
drop policy if exists "dokumen: lihat sesuai pengajuan" on public.dokumen_pendukung;
create policy "dokumen: lihat sesuai pengajuan" on public.dokumen_pendukung
  for select to authenticated
  using (public.can_view_pengajuan(pengajuan_id));

drop policy if exists "dokumen: pemohon unggah ke miliknya" on public.dokumen_pendukung;
create policy "dokumen: pemohon unggah ke miliknya" on public.dokumen_pendukung
  for insert to authenticated
  with check (
    exists (
      select 1 from public.pengajuan_rekom p
      where p.id = pengajuan_id and p.pemohon_id = auth.uid()
    )
  );

drop policy if exists "dokumen: pemohon hapus miliknya" on public.dokumen_pendukung;
create policy "dokumen: pemohon hapus miliknya" on public.dokumen_pendukung
  for delete to authenticated
  using (
    exists (
      select 1 from public.pengajuan_rekom p
      where p.id = pengajuan_id and p.pemohon_id = auth.uid()
    )
  );

-- ---- tracking_status ----
drop policy if exists "tracking: lihat sesuai pengajuan" on public.tracking_status;
create policy "tracking: lihat sesuai pengajuan" on public.tracking_status
  for select to authenticated
  using (public.can_view_pengajuan(pengajuan_id));

drop policy if exists "tracking: aktor mencatat sebagai dirinya" on public.tracking_status;
create policy "tracking: aktor mencatat sebagai dirinya" on public.tracking_status
  for insert to authenticated
  with check (oleh_user_id = auth.uid());

-- ---- notifications ----
drop policy if exists "notif: lihat miliknya" on public.notifications;
create policy "notif: lihat miliknya" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notif: tandai dibaca miliknya" on public.notifications;
create policy "notif: tandai dibaca miliknya" on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notif: sistem/kiriman lintas pengguna" on public.notifications;
create policy "notif: sistem/kiriman lintas pengguna" on public.notifications
  for insert to authenticated with check (true);

-- ============================================================================
-- 13. REALTIME
-- ============================================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.pengajuan_rekom;
  exception when duplicate_object then null;
  when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.tracking_status;
  exception when duplicate_object then null;
  when others then null;
  end;
end $$;

-- ============================================================================
-- 14. STORAGE: bucket + policy
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('dokumen-rekom', 'dokumen-rekom', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('rekom-terbit', 'rekom-terbit', true)
on conflict (id) do nothing;

-- dokumen-rekom (privat): unggah & baca oleh user terautentikasi
drop policy if exists "storage: authenticated unggah dokumen" on storage.objects;
create policy "storage: authenticated unggah dokumen" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dokumen-rekom');

drop policy if exists "storage: authenticated baca dokumen" on storage.objects;
create policy "storage: authenticated baca dokumen" on storage.objects
  for select to authenticated
  using (bucket_id = 'dokumen-rekom');

drop policy if exists "storage: authenticated hapus dokumen" on storage.objects;
create policy "storage: authenticated hapus dokumen" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dokumen-rekom');

-- rekom-terbit (publik): siapa pun boleh mengunduh surat yang sudah terbit
drop policy if exists "storage: publik baca rekom terbit" on storage.objects;
create policy "storage: publik baca rekom terbit" on storage.objects
  for select to public
  using (bucket_id = 'rekom-terbit');

drop policy if exists "storage: authenticated unggah rekom terbit" on storage.objects;
create policy "storage: authenticated unggah rekom terbit" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'rekom-terbit');

-- ============================================================================
-- 15. SEED: 8 JENIS REKOMENDASI AWAL
-- ============================================================================
insert into public.master_jenis_rekom (kode_jenis, nama_jenis, deskripsi, icon, warna, bidang, persyaratan_json, template_nomor, urutan)
values
(
  'SIP-DMK', 'Rekomendasi SIP Dokter / Perawat / Bidan',
  'Surat rekomendasi pengajuan Surat Izin Praktik (SIP) tenaga kesehatan di wilayah Kabupaten Kutai Kartanegara.',
  'Stethoscope', '#1E3A8A', 'SDMK',
  '{"fields":[{"key":"nama_tenaga_kesehatan","label":"Nama Tenaga Kesehatan","type":"text","required":true},{"key":"profesi","label":"Profesi","type":"select","required":true,"options":["Dokter Umum","Dokter Spesialis","Perawat","Bidan","Ahli Gizi","Apoteker"]},{"key":"no_str","label":"Nomor STR","type":"text","required":true},{"key":"masa_berlaku_str","label":"Masa Berlaku STR","type":"date","required":true},{"key":"tempat_praktik","label":"Tempat Praktik (Fasilitas)","type":"text","required":true},{"key":"alamat_praktik","label":"Alamat Praktik","type":"textarea","required":true}],"dokumen":[{"nama":"Scan KTP","required":true},{"nama":"Scan STR aktif","required":true},{"nama":"Scan Ijazah & SIPP","required":true},{"nama":"Surat rekomendasi organisasi profesi","required":false}]}',
  '440/{seq}/SDMK/Dinkes-Kukar/{year}', 1
),
(
  'IZIN-KLNK', 'Rekomendasi Izin Klinik Pratama / Utama',
  'Rekomendasi pendirian dan pengoperasian klinik pratama maupun klinik utama di Kabupaten Kutai Kartanegara.',
  'Hospital', '#0F766E', 'Yankes',
  '{"fields":[{"key":"nama_klinik","label":"Nama Klinik","type":"text","required":true},{"key":"kelas_klinik","label":"Kelas Klinik","type":"select","required":true,"options":["Pratama","Utama"]},{"key":"alamat_klinik","label":"Alamat Klinik","type":"textarea","required":true},{"key":"penanggung_jawab","label":"Penanggung Jawab Klinik (Dokter)","type":"text","required":true},{"key":"no_str_pj","label":"Nomor STR Penanggung Jawab","type":"text","required":true},{"key":"kapasitas_ranjang","label":"Kapasitas Tempat Tidur","type":"number","required":false}],"dokumen":[{"nama":"Scan KTP penanggung jawab","required":true},{"nama":"Scan STR & SIP dokter PJ","required":true},{"nama":"Denah bangunan klinik","required":true},{"nama":"Akta pendirian badan usaha","required":false}]}',
  '440/{seq}/YK/Dinkes-Kukar/{year}', 2
),
(
  'IZIN-APT', 'Rekomendasi Izin Apotek / Toko Obat',
  'Rekomendasi perizinan apotek, toko obat, dan depot obat oleh Dinas Kesehatan sebelum izin dari DPMPTSP.',
  'Pill', '#7C3AED', 'Farmalkes',
  '{"fields":[{"key":"nama_usaha","label":"Nama Apotek / Toko Obat","type":"text","required":true},{"key":"jenis_usaha","label":"Jenis Usaha","type":"select","required":true,"options":["Apotek","Toko Obat","Depot Obat"]},{"key":"alamat_usaha","label":"Alamat Usaha","type":"textarea","required":true},{"key":"apoteker_pengelola","label":"Nama Apoteker Pengelola","type":"text","required":true},{"key":"no_sipa","label":"Nomor SIPA Apoteker","type":"text","required":false}],"dokumen":[{"nama":"Scan KTP pemohon","required":true},{"nama":"Scan Ijazah & SIPA apoteker","required":true},{"nama":"Foto tampak depan tempat usaha","required":true}]}',
  '440/{seq}/FAR/Dinkes-Kukar/{year}', 3
),
(
  'SIP-PM', 'Rekomendasi Izin Praktik Mandiri',
  'Surat rekomendasi praktik mandiri tenaga kesehatan (perawat / bidan mandiri) di wilayah kerja Dinkes Kukar.',
  'Home', '#DB2777', 'SDMK',
  '{"fields":[{"key":"nama_pemohon","label":"Nama Pemohon","type":"text","required":true},{"key":"profesi","label":"Profesi","type":"select","required":true,"options":["Perawat","Bidan"]},{"key":"no_str","label":"Nomor STR","type":"text","required":true},{"key":"alamat_praktik","label":"Alamat Praktik Mandiri","type":"textarea","required":true}],"dokumen":[{"nama":"Scan KTP","required":true},{"nama":"Scan STR","required":true},{"nama":"Scan sertifikat manajemen usaha (bagi bidan)","required":false}]}',
  '440/{seq}/SDMK/Dinkes-Kukar/{year}', 4
),
(
  'PLATARAN', 'Fasilitasi Pelatihan / SKP Plataran Sehat',
  'Rekomendasi fasilitasi kegiatan pelatihan dan pencapaian SKP melalui program Plataran Sehat bagi pegawai dan tenaga kesehatan.',
  'GraduationCap', '#D97706', 'SDMK',
  '{"fields":[{"key":"nama_pegawai","label":"Nama Pegawai","type":"text","required":true},{"key":"nip","label":"NIP","type":"text","required":false},{"key":"pangkat_golongan","label":"Pangkat / Golongan","type":"text","required":false},{"key":"unit_kerja","label":"Unit Kerja","type":"text","required":true},{"key":"nama_pelatihan","label":"Nama Pelatihan / Kegiatan","type":"text","required":true},{"key":"penyelenggara","label":"Penyelenggara","type":"text","required":false},{"key":"tgl_pelaksanaan","label":"Tanggal Pelaksanaan","type":"date","required":true}],"dokumen":[{"nama":"Surat permohonan pemohon","required":true},{"nama":"Scan SK pengangkatan","required":false},{"nama":"Bukti registrasi pelatihan","required":true}]}',
  '440/{seq}/SDMK/Dinkes-Kukar/{year}', 5
),
(
  'STUDI-LANJUT', 'Rekomendasi Studi Lanjut / Tugas Belajar',
  'Rekomendasi pengajuan studi lanjut, tugas belajar, dan izin belajar bagi pegawai Dinas Kesehatan Kukar.',
  'BookOpen', '#0284C7', 'Sekretariat',
  '{"fields":[{"key":"nama_pegawai","label":"Nama Pegawai","type":"text","required":true},{"key":"nip","label":"NIP","type":"text","required":true},{"key":"jabatan","label":"Jabatan Sekarang","type":"text","required":true},{"key":"jenjang_studi","label":"Jenjang Studi","type":"select","required":true,"options":["S2","S3","Profesi","Lainnya"]},{"key":"perguruan_tinggi","label":"Perguruan Tinggi Tujuan","type":"text","required":true},{"key":"prodi","label":"Program Studi","type":"text","required":true}],"dokumen":[{"nama":"Surat permohonan pribadi","required":true},{"nama":"Scan SK CPNS / PNS terakhir","required":true},{"nama":"Surat penerimaan (LoA) perguruan tinggi","required":true}]}',
  '440/{seq}/SET/Dinkes-Kukar/{year}', 6
),
(
  'PINDAH-TUGAS', 'Rekomendasi Pindah Tugas',
  'Rekomendasi pengajuan pindah tugas (rotasi / mutasi) pegawai di lingkungan Dinas Kesehatan Kutai Kartanegara.',
  'ArrowLeftRight', '#4F46E5', 'Sekretariat',
  '{"fields":[{"key":"nama_pegawai","label":"Nama Pegawai","type":"text","required":true},{"key":"nip","label":"NIP","type":"text","required":true},{"key":"unit_kerja_asal","label":"Unit Kerja Asal","type":"text","required":true},{"key":"unit_kerja_tujuan","label":"Unit Kerja Tujuan","type":"text","required":true},{"key":"alasan","label":"Alasan Pindah Tugas","type":"textarea","required":true}],"dokumen":[{"nama":"Surat permohonan pribadi","required":true},{"nama":"Scan SK pengangkatan terakhir","required":true},{"nama":"Scan SKP 1 tahun terakhir","required":false}]}',
  '440/{seq}/SET/Dinkes-Kukar/{year}', 7
),
(
  'LAIN-LAIN', 'Rekomendasi Lain-lain (Custom)',
  'Jenis rekomendasi fleksibel untuk kebutuhan surat rekomendasi lain yang belum terdaftar. Form dapat disesuaikan Super Admin.',
  'ClipboardList', '#475569', 'Sekretariat',
  '{"fields":[{"key":"keperluan","label":"Keperluan Rekomendasi","type":"textarea","required":true},{"key":"instansi_tujuan","label":"Instansi Tujuan","type":"text","required":false}],"dokumen":[{"nama":"Surat permohonan pemohon","required":true}]}',
  '440/{seq}/SET/Dinkes-Kukar/{year}', 8
)
on conflict (kode_jenis) do nothing;

-- ============================================================================
-- SELESAI. Catatan:
-- 1. Buat user pertama lewat Authentication > Users > Add user, lalu ubah
--    kolom role di tabel profiles menjadi 'super_admin' (via SQL editor).
-- 2. Role lain (verifikator/admin_tu/kabid/kadis) diatur Super Admin dari
--    halaman "Kelola Pengguna" di aplikasi.
-- ============================================================================
