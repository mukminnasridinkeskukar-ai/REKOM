-- ============================================================================
-- E-REKOM — Aturan 1 NIK = 1 Akun + Lupa Akun (atur ulang kata sandi sendiri)
-- ============================================================================
-- Cara pakai: Supabase Dashboard > SQL Editor > New query > paste SELURUH isi
-- file ini > Run. Aman dijalankan berulang (idempotent).
--
-- Yang dilakukan file ini:
--   1. Merapikan data lama (NIK & No. HP diisi digit saja, kosong -> NULL)
--   2. Menampilkan tinjauan NIK ganda (read-only)
--   3. Merapikan NIK ganda: akun TERLAMA tetap memakai NIK, sisanya dikosongkan
--   4. Kunci database: unique index — satu NIK hanya untuk satu akun
--   5. Fungsi cek NIK (untuk notifikasi "NIK sudah terdaftar" saat mendaftar)
--   6. Tabel log percobaan lupa akun (pembatas laju anti pembobolan)
--   7. Fungsi lupa akun: verifikasi NIK + No. HP -> ubah kata sandi sendiri
--   8. Fungsi darurat admin (hanya dari SQL Editor)
--   9. Memperbarui trigger pendaftaran agar NIK/HP baru tersimpan rapi
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. RAPIKAN DATA LAMA: NIK & No. HP digit saja, string kosong -> NULL
-- ---------------------------------------------------------------------------
update public.profiles
set nik = nullif(regexp_replace(nik, '\D', '', 'g'), '')
where nik is distinct from nullif(regexp_replace(nik, '\D', '', 'g'), '');

update public.profiles
set no_hp = nullif(regexp_replace(no_hp, '\D', '', 'g'), '')
where no_hp is distinct from nullif(regexp_replace(no_hp, '\D', '', 'g'), '');

-- ---------------------------------------------------------------------------
-- 2. TINJAUAN NIK GANDA (tidak mengubah apa pun)
--    Bila ada barisnya, artinya akun ganda yang NIK-nya dikosongkan di langkah 3.
-- ---------------------------------------------------------------------------
select nik,
       count(*) as jumlah_akun,
       string_agg(nama_lengkap || ' <' || coalesce(email, 'tanpa email') || '>', ' ; '
                  order by created_at) as daftar_akun
from public.profiles
where nik is not null
group by nik
having count(*) > 1;

-- ---------------------------------------------------------------------------
-- 3. RAPIKAN NIK GANDA: akun terlama (paling dulu mendaftar) tetap memakai NIK,
--    akun duplikat yang lebih baru dikosongkan NIK-nya.
-- ---------------------------------------------------------------------------
with urut as (
  select id,
         row_number() over (partition by nik order by created_at asc, id asc) as baris
  from public.profiles
  where nik is not null
)
update public.profiles p
set nik = null, updated_at = now()
from urut u
where u.id = p.id and u.baris > 1;

-- ---------------------------------------------------------------------------
-- 4. KUNCI DI DATABASE: satu NIK hanya boleh dimiliki satu akun
-- ---------------------------------------------------------------------------
create unique index if not exists profiles_nik_unik
  on public.profiles (nik)
  where nik is not null;

-- ---------------------------------------------------------------------------
-- 5. FUNGSI CEK NIK — dipakai form pendaftaran & pengubahan profil.
--    Mengembalikan status + nama & email yang DISAMARKAN (tidak membocorkan
--    data pendaftar lain ke publik).
-- ---------------------------------------------------------------------------
create or replace function public.cek_nik_terdaftar(
  p_nik text,
  p_exclude_user uuid default null
)
returns table (sudah_terdaftar boolean, nama_terdaftar text, email_terdaftar text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nik text := nullif(regexp_replace(coalesce(p_nik, ''), '\D', '', 'g'), '');
  r record;
begin
  if v_nik is null or length(v_nik) <> 16 then
    return query select false::boolean, null::text, null::text;
    return;
  end if;

  select pr.nama_lengkap, pr.email into r
  from public.profiles pr
  where pr.nik = v_nik
    and (p_exclude_user is null or pr.id <> p_exclude_user)
  order by pr.created_at asc
  limit 1;

  if r is null then
    return query select false::boolean, null::text, null::text;
  else
    return query select true::boolean,
      coalesce(
        array_to_string(
          array(select left(w, 1) || repeat('*', greatest(length(w) - 1, 0))
                from unnest(string_to_array(coalesce(r.nama_lengkap, '-'), ' ')) as w),
          ' '
        ), '-'),
      case
        when r.email is null then 'tanpa email'
        when position('@' in r.email) > 1
          then left(r.email, 1) || '***' || substring(r.email from position('@' in r.email))
        else '***'
      end;
  end if;
end;
$$;

revoke all on function public.cek_nik_terdaftar(text, uuid) from public;
grant execute on function public.cek_nik_terdaftar(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. LOG PERCOBAAN LUPA AKUN — pembatas laju (maks 5 percobaan / 15 menit / NIK)
--    RLS aktif tanpa policy: tidak terbaca dari klien, hanya dari fungsi.
-- ---------------------------------------------------------------------------
create table if not exists public.lupa_password_log (
  id         bigint generated always as identity primary key,
  nik_coba   text not null,
  sukses     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists lupa_password_log_nik_idx
  on public.lupa_password_log (nik_coba, created_at);
alter table public.lupa_password_log enable row level security;

-- ---------------------------------------------------------------------------
-- 7. FUNGSI LUPA AKUN — pemohon memulihkan sendiri aksesnya:
--    verifikasi NIK + No. HP terdaftar -> kata sandi diganti langsung.
--    Setelah berhasil, semua sesi lama dilogout otomatis.
-- ---------------------------------------------------------------------------
create or replace function public.lupa_password_reset(
  p_nik text,
  p_no_hp text,
  p_password text
)
returns table (ok boolean, pesan text, nama_lengkap text, email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nik  text := nullif(regexp_replace(coalesce(p_nik, ''), '\D', '', 'g'), '');
  v_hp   text := nullif(regexp_replace(coalesce(p_no_hp, ''), '\D', '', 'g'), '');
  v_pass text := coalesce(p_password, '');
  r record;
  v_coba int := 0;
  v_log_id bigint;
begin
  -- Pembatas laju: maks 5 percobaan per NIK per 15 menit
  select count(*) into v_coba
  from public.lupa_password_log
  where nik_coba = coalesce(v_nik, '-') and created_at > now() - interval '15 minutes';
  if v_coba >= 5 then
    return query select false::boolean,
      'Terlalu banyak percobaan untuk NIK ini. Tunggu 15 menit lagi atau hubungi Admin TU Dinkes.'::text,
      null::text, null::text;
    return;
  end if;

  -- Buang log yang sudah lebih dari 1 hari
  delete from public.lupa_password_log where created_at < now() - interval '1 day';

  -- Validasi masukan
  if v_nik is null or length(v_nik) <> 16 then
    return query select false::boolean, 'NIK harus 16 digit angka.'::text, null::text, null::text;
    return;
  end if;
  if v_hp is null or length(v_hp) < 9 then
    return query select false::boolean,
      'Masukkan No. HP yang terdaftar (contoh: 0812xxxxxxxx).'::text, null::text, null::text;
    return;
  end if;
  if length(v_pass) < 8 then
    return query select false::boolean,
      'Kata sandi baru minimal 8 karakter.'::text, null::text, null::text;
    return;
  end if;

  -- Catat percobaan ini (untuk pembatas laju)
  insert into public.lupa_password_log (nik_coba, sukses)
  values (v_nik, false)
  returning id into v_log_id;

  -- Cari akun berdasarkan NIK
  select pr.id, pr.nama_lengkap, pr.email, pr.no_hp into r
  from public.profiles pr
  where pr.nik = v_nik
  order by pr.created_at asc
  limit 1;

  if r is null then
    return query select false::boolean,
      'NIK tidak ditemukan. Pastikan NIK sesuai yang terdaftar, atau daftar akun baru.'::text,
      null::text, null::text;
    return;
  end if;

  -- Cocokkan No. HP: bandingkan 10 digit terakhir (toleransi awalan 0 / 62)
  if r.no_hp is null or right(r.no_hp, 10) <> right(v_hp, 10) then
    return query select false::boolean,
      'No. HP tidak cocok dengan akun NIK ini. Gunakan No. HP yang terdaftar saat mendaftar.'::text,
      null::text, null::text;
    return;
  end if;

  -- Ganti kata sandi di Supabase Auth + logout paksa semua perangkat
  update auth.users
  set encrypted_password = crypt(v_pass, gen_salt('bf')),
      updated_at = now()
  where id = r.id;
  delete from auth.refresh_tokens where user_id = r.id;

  update public.lupa_password_log set sukses = true where id = v_log_id;

  return query select true::boolean,
    'Kata sandi berhasil diubah. Silakan masuk dengan email akun Anda dan kata sandi baru.'::text,
    r.nama_lengkap, r.email;
end;
$$;

revoke all on function public.lupa_password_reset(text, text, text) from public;
grant execute on function public.lupa_password_reset(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. FUNGSI DARURAT ADMIN — atur ulang kata sandi via email (dari SQL Editor):
--    select public.admin_reset_password('nama@email.com', 'SandiBaru123');
--    TIDAK bisa dipanggil dari aplikasi/publik.
-- ---------------------------------------------------------------------------
create or replace function public.admin_reset_password(p_email text, p_password text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Kata sandi minimal 8 karakter.';
  end if;
  select id into v_id from auth.users where lower(email) = v_email limit 1;
  if v_id is null then
    raise exception 'Email % tidak ditemukan.', v_email;
  end if;
  update auth.users
  set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now()
  where id = v_id;
  delete from auth.refresh_tokens where user_id = v_id;
  return 'Kata sandi untuk ' || v_email || ' berhasil diubah.';
end;
$$;
revoke all on function public.admin_reset_password(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. PERBARUI TRIGGER PENDAFTARAN — NIK & No. HP baru otomatis dirapikan
--    (digit saja, kosong -> NULL) sehingga tidak merusak aturan unik.
-- ---------------------------------------------------------------------------
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
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'nik', ''), '\D', '', 'g'), ''),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'no_hp', ''), '\D', '', 'g'), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'asal_instansi', ''), 'Pemohon'),
    nullif(new.raw_user_meta_data ->> 'jabatan', ''),
    'pemohon' -- role default; Super Admin dapat mengubahnya dari menu Kelola Pengguna
  );
  return new;
end;
$$;

-- ============ SELESAI — aturan 1 NIK 1 akun & lupa akun aktif ============
