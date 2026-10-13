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

---
Task ID: 5
Agent: Super Z (main)
Task: Pengembangan — berkas surat terbit bersumber dari folder Storage "rekom-terbit"

Work Log:
- Eksplorasi alur lama: aksi "terbitkan" (Kadis) men set file_rekom_pdf_url = /api/pengajuan/{id}/pdf (PDF tergenerasi)
- Desain baru: penerbitan tetap sampai Kadis; saat "Tanda Tangan & Terbitkan" Kadis WAJIB memilih/mengunggah
  berkas hasil TTD dari bucket Storage "rekom-terbit"; berkas itulah yang tampil di akun pemohon & QR
- Backend: ActionInput.fileTerbit; supabase-store/demo-store validasi wajib berkas (path storage murni,
  tolak URL/".."); simpan path ke file_rekom_pdf_url
- Route baru /api/rekom-terbit/{id}: auth sesi (canRead) ATAU ?qr= valid; path -> URL publik
  {URL}/storage/v1/object/public/rekom-terbit/{path}; nilai warisan (/api/..., http) tetap diikuti;
  error = halaman HTML ramah (helper bersama src/lib/halaman-kesalahan.ts, /api/files ikut memakai)
- UI: komponen dialog-terbitkan.tsx (daftar berkas bucket rekom-terbit via list rekursif depth<=2,
  unggah langsung ke {kode}/{ts}-{nama}, radio pilih, tombol terbitkan terkunci tanpa berkas);
  lightbox: urlSurat resolver (/api/rekom-terbit bila berkas storage, fallback PDF lama);
  dashboard-client meneruskan fileTerbit; halaman verifikasi QR link baru
- supabase-rekom-terbit.sql: bucket rekom-terbit, policy staf (super_admin/admin_tu/kadis) insert/
  update/delete + select authenticated, DROP policy lama yang membuka unggah ke semua authenticated,
  RPC security-definer rekom_berkas_publik(p_qr) utk akses QR publik
- Rapikan lint admin/jenis (pola adjust-state-during-render); lint bersih
- Uji e2e lokal (mode demo, agent-browser): login Kadis -> dialog -> unggah PDF uji -> terbitkan ->
  status Terbit; pemohon melihat "Surat Rekomendasi Resmi" dari /api/rekom-terbit; tanpa sesi 401 HTML;
  QR valid publik 302 -> berkas; QR palsu ditolak
- Deploy 889813c + ce99053; produksi: route 401 HTML ramah AKTIF; bucket rekom-terbit menerima unggah
  super_admin (200) & URL publik terbaca; RPC + policy baru MENUNGGU user menjalankan SQL

Stage Summary:
- Penerbitan kini mengikat berkas surat fisik (scan/PDF TTD) dari folder rekom-terbit ke pengajuan
- Akun pemohon & halaman verifikasi QR menampilkan berkas tersebut (bukan PDF tergenerasi)
- BLOKIR sementara: Kadis belum bisa unggah/melihat daftar sampai SQL supabase-rekom-terbit.sql dijalankan
- Sisa: verifikasi tahap 2 (RPC + policy) setelah SQL dijalankan (scripts/verif-rekom-terbit-prod.py)

---
Task ID: 6
Agent: Super Z (main)
Task: Ganti alamat kantor — Jalan Gajah Mada No. 9 Tenggarong -> Jalan Cut Nyak Dien No.33 Tenggarong

Work Log:
- Pemetaan: 4 teks footer hardcoded (app-shell, login, beranda, verifikasi QR) + demo seed
  (Jl. Gajah Mada No. 45 = alamat praktik fiktif, dibiarkan)
- src/lib/config.ts ALAMAT_INSTANSI SUDAH alamat baru (dipakai kop surat PDF tergenerasi) — tak diubah
- Edit 4 file -> "Jalan Cut Nyak Dien No.33 Tenggarong 75512"; verifikasi grep bersih
- Commit 3e748e3; GitHub main masih 29cd505 (platform auto-snapshot c9bcfa8 TIDAK terpush)
- Token push hilang setelah pembaruan sesi (tak ada di .git-credentials/.netrc/env/.lokalsimpen);
  ls-remote anonim OK (repo public read), push tetap butuh token dari user

Stage Summary:
- Alamat kantor sudah diganti di 4 tampilan + kop surat sudah benar sejak config
- MENUNGGU token akses GitHub dari user untuk push -> deploy produksi

Lanjutan Task 6 (deploy):
- Token GitHub diterima dari user; push OK: 29cd505..10ece45 main -> main
  (10ece45 = snapshot platform worklog; fix alamat = 3e748e3 sudah termuat)
- Produksi rekom.mukminnasri.com TIDAK berubah setelah ±25 menit polling
  (x-vercel-cache MISS, no-store = bukan cache; server Vercel)
- URL deployment vercel.app 404 semua; diduga deploy otomatis GitHub tidak terpicu / build gagal
- Status: MENUNGGU user klik "Redeploy" di dashboard Vercel (atau lapor status build)

Penyelesaian Task 6 (LIVE):
- Build lokal mereproduksi error Vercel: files/[id]/route.tsx:11 impor UPLOAD_DIR dari
  @/app/api/upload/route yang terhapus -> Module not found -> bun run build exit 1
- Penyebab: .git/info/exclude (lokal) berisi upload/ + snapshot platform menghapus file;
  git add awal ditolak gitignore -> dibersihkan exclude-nya, file dipulihkan dari 29cd505
- Build lokal lulus; commit 730a2a1; push OK; auto-deploy Vercel sukses (~90 dtk)
- Verifikasi produksi: landing + login memuat "Cut Nyak Dien"; "Gajah Mada" = 0 sisa
- Status: SELESAI — alamat kantor baru tayang di seluruh halaman

---
Task ID: 7
Agent: Super Z (main)
Task: Cek & rapikan dashboard 0 + verifikasi keaslian via NIK

Work Log:
- Diag produksi (diag-dashboard-prod.py): superadmin@dinkes.go.id role=Pemohon & pemohon@dinkes.go.id
  role=Verifikator Sekretariat (TERTUKAR) -> RLS hanya tampil milik sendiri -> dashboard 0
- Diag Supabase (diag-supabase-state.py): RPC rekom_berkas_publik ADA (SQL rekom-terbit sudah dijalankan
  user), bucket rekom-terbit kosong, RLS anon normal
- Fitur baru verifikasi NIK: SuratNikDTO + verifikasiNik()/berkasTerbitNik() di kedua store;
  API POST /api/verifikasi-nik (rate limit 15/5m/IP); /api/rekom-terbit/{id}?nik= akses publik;
  UI /verifikasi dua tab (QR | NIK) dgn kartu hasil + unduh; error NIK salah = halaman ramah
- Dashboard-client: error muat tak lagi ditelan senyap -> banner amber + tombol Coba Lagi
- MASALAH PLATFORM: src/app/api/upload terhapus LAGI oleh sinkronisasi sandbox (pattern folder
  "upload") padahal ada di HEAD -> SOLUSI: rename ke /api/unggah + semua referensi (5 file)
- SQL baru supabase-pulih-dashboard-verifikasi-nik.sql: perbaiki role 8 akun uji + RPC
  rekom_verifikasi_nik + rekom_berkas_nik + tinjauan profil/rekap status
- Uji: lint OK; build OK; e2e demo (agent-browser): tab NIK -> kartu TERVERIFIKASI + unduh 302;
  NIK salah -> empty state; screenshot .smoke/uji-verifikasi-nik(-sukses).png
- Commit ef3c0e9; PUSH GAGAL: token GitHub dicabut/ditolak (401 Bad credentials)

Stage Summary:
- Kode fitur siap & teruji lokal; MENUNGGU token GitHub baru utk push -> deploy
- MENUNGGU user menjalankan supabase-pulih-dashboard-verifikasi-nik.sql (perbaikan dashboard
  + mengaktifkan backend verifikasi NIK di produksi)

---
Task ID: 7 (lanjutan — deploy & verifikasi produksi)
Agent: Super Z (main)
Task: Push commit ef3c0e9 (verifikasi NIK + pulih dashboard) dgn token GitHub baru; verifikasi produksi

Work Log:
- Token baru diterima; build lokal lulus; push OK: 730a2a1..4074726 main -> main
  (memuat ef3c0e9 = fitur verifikasi NIK + perbaikan dashboard + rename /api/upload -> /api/unggah)
- Cek Supabase produksi: RPC rekom_verifikasi_nik ADA (HTTP 200) -> user sudah menjalankan
  supabase-pulih-dashboard-verifikasi-nik.sql
- Poll produksi: deploy tayang saat POST /api/verifikasi-nik berubah 404 -> 400 (±3 menit setelah push)
- Verifikasi produksi:
  * /verifikasi memuat tab NIK
  * POST NIK dummy 16 digit -> {"data":[]} HTTP 200 (tidak terdaftar = empty state)
  * NIK 3515044412050001 (Margareta Fitri) -> menemukan pengajuan terbit B-003/DINKES/...,
    jenis Beasiswa Afirmasi, adaBerkas=true
  * Unduh /api/rekom-terbit/{id}?nik=cocok -> 302 ke berkas bucket rekom-terbit, PDF utuh 723 KB 2 hal
  * NIK salah -> 403 halaman ramah "Verifikasi Tidak Cocok — E-REKOM Dinkes Kukar"
- Dashboard: login superadmin@dinkes.go.id -> role super_admin, /api/pengajuan 15 data,
  /api/stats {totalPengajuan:15, terbit:11, terbitBulanIni:11, totalJenis:4} -> TIDAK lagi 0
- Akun pemohon@dinkes.go.id (email asli verifikator.sekretariat@dinkes.go.id) role pemohon,
  0 pengajuan = wajar (belum punya pengajuan sendiri)
- Token GitHub TIDAK disimpan (dihapus dari kredensial sesi; keamanan seperti pola sebelumnya)

Stage Summary:
- SELESAI di produksi: dashboard menampilkan data nyata; verifikasi keaslian via NIK aktif
  (cocok -> unduh surat terbit, salah -> ditolak)
- Catatan: angka "diajukan:0" normal — 15 pengajuan terdiri dari 11 terbit + sisanya
  menunggu_ttd_kadis/etapas lain sesuai definisi status
- Langkah opsional berikutnya (opsional bagi user): coba alur Kadis "Tanda Tangan & Terbitkan"
  untuk mengisi bucket rekom-terbit utk pengajuan lain yang masih menunggu TTD

---
Task ID: 8
Agent: Super Z (main)
Task: "masih 0" — akar masalah statistik beranda & solusi permanen

Work Log:
- Laporan user "masih 0" -> verifikasi ulang: /api/stats & /api/pengajuan sebagai super_admin
  SUDAH benar (15 pengajuan). Yang 0 adalah kartu STATISTIK DI BERANDA (halaman publik)
- Bukti: curl beranda produksi = "0 0 0 0" (Total Pengajuan, Surat Terbit, Menunggu Verifikasi, Jenis)
- Akar masalah: Komponen Stats (src/app/page.tsx) -> store.stats() dihitung server-side TANPA
  sesi (klien anon) -> RLS pengajuan_rekom tidak memberi anon akses baca -> semua count = 0;
  catch{} menyembunyikan kegagalan
- Semua akun produksi sudah role benar (cek /api/users): mukminnasri.dinkeskukar@gmail.com
  = super_admin, admin.tu/kabid/kadis/verifikator sesuai
- Solusi: RPC security definer rekom_stats_publik() (angka agregat publik, tanpa data pribadi),
  grant anon+authenticated — file supabase-stats-publik.sql (idempotent)
- Kode: supabase-store.stats() coba RPC dulu, fallback hitung lama (jaga masa transisi)
- Build lulus; commit 7130573; push OK; deploy tayang (build ID ymECsrXJ9RwMMWN89xUph)
- RPC belum ada di produksi (404 PGRST202) -> beranda tetap 0 SAMPAI user menjalankan SQL

Stage Summary:
- Dashboard login (per role) sudah benar; beranda menunggu 1 langkah user:
  jalankan supabase-stats-publik.sql di Supabase SQL Editor -> angka beranda langsung tayang

---
Task ID: 9
Agent: Super Z (main)
Task: Pengembangan — kartu statistik beranda jadi lightbox/popup + rincian per jenis

Work Log:
- Dump data produksi: kolom formulir nyata = nama_lengkap, program_studi, puskesmas_tujuan,
  fakultas_dan_universitas (gabungan), universitas_tujuan (beberapa jenis)
- SQL baru supabase-rekap-publik.sql: RPC security-definer rekom_rekap_publik() — kolom
  TERBATAS non-sensitif (status, jenis, nama, prodi, puskesmas, fakultas&univ, tgl); NIK/HP/
  alamat/email TIDAK ikut; grant anon+authenticated; idempotent
- Store: RekapPublikDTO + rekapPublik() di interface; supabase-store via RPC (error -> []);
  demo-store via Prisma (parse dataFormJson + fallback nama pemohon)
- UI: komponen client rekap-stats.tsx — 4 kartu klikabel (hover "klik untuk rincian"),
  Dialog popup: Total Pengajuan/Surat Terbit/Menunggu Verifikasi = tabel 4 kolom + kotak
  cari + hitung data; Jenis Rekomendasi = daftar jumlah per jenis (dgn jenis aktif bernilai 0)
- page.tsx Stats: ambil stats + rekap + jenis (try/catch terpisah), render <RekapStats/>
- Uji lokal: build OK; lint OK; agent-browser — popup Total (tabel+8 data), Jenis (5 jenis dgn
  badge jumlah), Surat Terbit (hanya baris terbit), cari "Andi"->1 baris, "zzzz"->kosong;
  screenshot .smoke/uji-popup-(tabel|jenis|terbit|cari).png
- Catatan: sandbox .env berisi kredensial Supabase -> dev lokal memakai supabase-store,
  popup lokal kosong sebelum SQL (perilaku benar); tabel teruji via mode demo dipaksa
- Commit 6f05bb3; push OK; deploy tayang ('klik untuk rincian' = 4 kartu di produksi)

Stage Summary:
- Fitur popup rekap LIVE di beranda produksi; MENUNGGU user menjalankan SQL:
  supabase-stats-publik.sql (angka beranda) + supabase-rekap-publik.sql (isi popup)
- Setelah SQL dijalankan: angka & popup langsung terisi tanpa deploy ulang
