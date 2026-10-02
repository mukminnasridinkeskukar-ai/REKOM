# Worklog E-REKOM

---
Task ID: 1
Agent: Super Z (main)
Task: Cek & rapikan: (1) 404 pratinjau dokumen, (2) data "Andi Dea Aulia Amanda, S.KG" tidak tampil

Work Log:
- Diagnosa produksi: 10 dokumen_pendukung ber-file_url "/api/files/{uuid}.ext" (mode demo),
  ukuran=0 -> pratinjau 404; akar: halaman Baru & Perbaiki mengunggah via /api/upload (tmpdir
  Vercel ephemeral) lalu menimpa fileUrl Storage dari FileUploader (bug unggah ganda)
- Perbaikan (commit 7604cc4): src/lib/upload-client.ts (unggahBerkas -> Storage langsung),
  file-uploader.tsx flag terunggah, api/files/[id]/route.tsx 410 + pesan jelas utk warisan,
  lightbox notice unggah ulang, supabase-cek-data-andi-dea.sql (diagnostik)
- Deploy 7604cc4; verifikasi produksi OK

Stage Summary:
- Unggahan BARU tersimpan permanen di Storage; 10 dokumen lama dianggap hilang (perlu unggah ulang)
- "Andi Dea": akun ada, belum punya pengajuan

---
Task ID: 2
Agent: Super Z (main)
Task: 1 NIK = 1 akun + notifikasi NIK terdaftar + tombol Lupa Akun (reset kata sandi mandiri)

Work Log:
- src/lib/nik.ts (normalisasiNik/isNikValid/normalisasiHp/hpCocok/maskEmail/maskNama)
- supabase-nik-akun.sql: normalisasi NIK/HP, unique partial index profiles(nik),
  RPC cek_nik_terdaftar (masked), lupa_password_log + rate limit, RPC lupa_password_reset
  (verif NIK+HP -> crypt + hapus refresh_tokens), admin_reset_password, update handle_new_user
- api/auth/cek-nik (GET), api/auth/lupa-password (POST), register (NIK wajib 16 digit +
  pre-cek 409 NIK_TERDAFTAR), profile PATCH (validasi), /lupa-akun (baru), /daftar (cek live),
  /login (link), /profil (hint)
- Uji lokal 11 kasus lulus; deploy 4d17458 + bc01f5f; RPC berfungsi penuh setelah user
  menjalankan SQL (terverifikasi pada Task 4)

---
Task ID: 3
Agent: Super Z (main)
Task: (1) Storage per-folder pemohon + SQL, (2) buka berkas di tab baru bukan JSON mentah

Work Log:
- src/lib/upload-client.ts: path {Nama-Pemohon--uid8}/{pengajuanId}/{ts}-{file}; folderPemohon()
- api/files/[id]/route.tsx: SEMUA error jadi halaman HTML ramah (401/403/404/410, branding Dinkes)
- lightbox-rekom.tsx: sembunyikan aksi utk berkas warisan, ikon FileText
- supabase-folder-pemohon.sql: bucket + policy storage per-folder (insert/update/delete
  folder sendiri, baca authenticated, super_admin/admin_tu bypass), dokumen super_admin update,
  profiles super_admin insert, tinjauan bucket
- scripts/pindah-folder-pemohon.py (cek: 11/11 dokumen warisan, tak ada objek storage)
- Deploy d17e061 + cf9ef17; produksi: /api/files warisan = 410 HTML ramah

---
Task ID: 4
Agent: Super Z (main)
Task: Cek ulang produksi pasca-SQL + penyelamatan berkas lama + perbaikan akar folder pemohon

Work Log:
- Verifikasi (scripts/verif-folder-prod.py): RPC cek_nik_terdaftar & lupa_password_reset AKTIF;
  policy per-folder AKTIF (unggah folder sendiri 200, folder orang lain ditolak);
  profil akun uji pemohon@dinkes.go.id dilengkapi via policy "insert sendiri"
- TEMUAN BESAR: 17 berkas asli ADA di storage tmp/ — FileUploader (komponen unggah utama)
  unggah ke tmp/ ({pengajuanId} saat perbaikan), baris dokumen menunjuk /api/files mati;
  upload-client (folder pemohon) tak terpakai karena terunggah=true
- Perbaikan akar (commit 3767c7b): file-uploader.tsx -> {Nama-Pemohon--id8}/
  {idPengajuan|"pra-pengajuan"}/{ts}-{nama}; export profilSaya(); error sesi jelas
- PENYELAMATAN (petakan-dokumen-prod.py, selamatkan-berkas-prod.py, verif-selamatkan.py):
  10/11 dokumen warisan dipadankan (pengajuan+ekstensi+urutan waktu+nama+ukuran byte identik),
  objek dipindah ke folder pemohon, file_url/tipe_file/ukuran diperbarui via superadmin;
  verifikasi: 10/10 signed URL 200 ct benar; end-to-end /api/files/{id} 302 -> 200 byte asli
- Sisa: 1 dokumen draft tanpa padanan (unggah ulang via Perbaiki); 7 berkas tmp/ tanpa rujukan
  dibiarkan; objek uji dibersihkan; folder uji kosong
- cek-akhir.py: 10/10 LOLOS (RPC, cek-nik e2e, profil, lupa-akun, 10 dokumen, HTML ramah,
  folder pemohon, tmp bersih-opsional)

Stage Summary:
- Storage per-folder pemohon aktif utk SEMUA alur unggah; policy mengunci folder
- 10 dokumen yang dianggap hilang SELAMAT; pengajuan aktif (Dhinda, Margareta) dokumennya lengkap
- Sisa kerja opsional: hapus 7 berkas tmp/ via Storage UI bila dikehendaki
