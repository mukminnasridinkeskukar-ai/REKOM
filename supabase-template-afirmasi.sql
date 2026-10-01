-- ============================================================================
-- E-REKOM — TEMPLATE SURAT PERNYATAAN PENDAYAGUNAAN (BEASISWA AFIRMASI)
-- Jalankan SEKALI di Supabase SQL Editor (aman diulang / idempotent).
--
-- Yang dilakukan skrip ini:
--   1. Upgrade fungsi nomor surat: dukungan variabel {month} (B-{seq}/DINKES/400.9.13.2/{month}/{year})
--   2. Tambah kolom formulir "Puskesmas Penempatan" pada jenis REKOM-AFIRMASI (bila belum ada)
--   3. Pasang template surat resmi Dinkes (Surat Pernyataan Pendayagunaan) pada jenis REKOM-AFIRMASI
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Fungsi generator nomor surat — sekarang mendukung {seq}, {kode}, {month}, {year}
-- ---------------------------------------------------------------------------
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
  v_month    text := lpad(extract(month from now())::text, 2, '0');
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

  return replace(replace(replace(replace(v_template,
    '{seq}',  lpad(v_seq::text, 3, '0')),
    '{kode}', v_kode),
    '{month}', v_month),
    '{year}', v_year::text);
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Kolom formulir baru: Puskesmas Penempatan (dipakai placeholder {puskesmas_tujuan})
-- ---------------------------------------------------------------------------
update public.master_jenis_rekom
set persyaratan_json = jsonb_set(
  persyaratan_json,
  '{fields}',
  (coalesce(persyaratan_json->'fields', '[]'::jsonb))
    || '[{"key":"puskesmas_tujuan","type":"text","label":"Puskesmas Penempatan (tujuan didayagunakan)","required":true}]'::jsonb
)
where kode_jenis = 'REKOM-AFIRMASI'
  and not exists (
    select 1 from jsonb_array_elements(coalesce(persyaratan_json->'fields', '[]'::jsonb)) f
    where f->>'key' = 'puskesmas_tujuan'
  );

-- ---------------------------------------------------------------------------
-- 3) Pasang template surat resmi pada jenis REKOM-AFIRMASI
--    (nanti tetap bisa diubah lewat: Admin -> Jenis Rekomendasi -> Edit -> tab Template Surat)
-- ---------------------------------------------------------------------------
update public.master_jenis_rekom
set template_surat = $tpl$
{
  "judul": "SURAT PERNYATAAN PENDAYAGUNAAN",
  "lampiran": "",
  "letakNomor": "bawah",
  "pembuka": "Yang bertanda tangan di bawah ini:",
  "barisIdentitas": [
    { "label": "nama", "kunci": "nama_kadis" },
    { "label": "NIP", "kunci": "nip_kadis" },
    { "label": "pangkat/golongan", "kunci": "", "nilai": "Pembina Tk.I/IVb" },
    { "label": "jabatan", "kunci": "", "nilai": "Kepala Dinas" },
    { "label": "unit kerja", "kunci": "", "nilai": "Dinas Kesehatan" },
    { "label": "Kab./Kota", "kunci": "", "nilai": "Kabupaten Kutai Kartanegara" },
    { "label": "Provinsi", "kunci": "", "nilai": "Kalimantan Timur" }
  ],
  "pembukaKedua": "Menyatakan dengan sesungguhnya bahwa nama yang tercantum di bawah ini:",
  "barisIdentitasKedua": [
    { "label": "nama", "kunci": "nama_lengkap" },
    { "label": "NIK", "kunci": "nik" },
    { "label": "fakultas", "kunci": "", "nilai": "Fakultas {pendidikan_terakhir} {asal_kampus/_pt}" },
    { "label": "alamat sesuai KTP", "kunci": "alamat_domisili" }
  ],
  "penutup": [
    "Setelah menyelesaikan pendidikan akan diterima kembali untuk didayagunakan di {puskesmas_tujuan} milik Pemerintah Daerah Kabupaten Kutai Kartanegara Provinsi Kalimantan Timur dengan ketentuan:",
    "1. bersedia mengusulkan formasi ASN untuk yang bersangkutan sesuai ketentuan peraturan perundang-undangan.",
    "2. menyediakan sarana dan prasarana untuk menunjang pelaksanaan tugas sesuai kompetensi serta fasilitas lainnya sesuai ketentuan peraturan perundang-undangan.",
    "3. apabila yang bersangkutan tidak dapat didayagunakan di {puskesmas_tujuan}, maka dapat didayagunakan pada Puskesmas lain yang masih membutuhkan di wilayah Kabupaten Kutai Kartanegara atau di wilayah Provinsi Kalimantan Timur.",
    "4. apabila yang bersangkutan tidak dapat didayagunakan di wilayah Provinsi Kalimantan Timur, maka yang bersangkutan akan didayagunakan oleh Kementerian Kesehatan sesuai kebutuhan prioritas nasional.",
    "Demikian Surat Pernyataan ini kami buat untuk dapat digunakan sebagaimana semestinya."
  ],
  "penempatanTtd": ["Ditetapkan di: Tenggarong", "Pada tanggal: {tgl_terbit}"],
  "gayaTtd": "elektronik",
  "pangkatTtd": "Pembina Tingkat I",
  "jabatanTtd": "KEPALA DINAS KESEHATAN",
  "kotaTtd": "Tenggarong"
}
$tpl$
where kode_jenis = 'REKOM-AFIRMASI';

-- ---------------------------------------------------------------------------
-- Verifikasi (lihat hasil di bagian bawah editor)
-- ---------------------------------------------------------------------------
select kode_jenis, template_nomor,
       (template_surat is not null) as template_terpasang,
       exists (
         select 1 from jsonb_array_elements(persyaratan_json->'fields') f
         where f->>'key' = 'puskesmas_tujuan'
       ) as kolom_puskesmas_ada
from public.master_jenis_rekom
where kode_jenis = 'REKOM-AFIRMASI';
