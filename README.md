# E-REKOM — Tata Kelola Rekomendasi Kepala Dinas Kesehatan Kabupaten Kutai Kartanegara

Platform tata kelola surat rekomendasi **apa saja** untuk Dinas Kesehatan Kutai Kartanegara:
pengajuan daring dengan formulir dinamis, verifikasi berkas lintas bidang, penomoran surat
otomatis (`440/XXX/SDMK/Dinkes-Kukar/2026`), tanda tangan Kepala Dinas, PDF berkop resmi
dengan **QR Code verifikasi keaslian**, serta notifikasi realtime.

> **Fleksibel**: Super Admin dapat menambah/mengubah jenis rekomendasi (kolom formulir +
> dokumen persyaratan) dari antarmuka admin — tanpa mengubah kode.

---

## Tumpukan Teknologi

| Bagian | Teknologi |
| --- | --- |
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui |
| Animasi | Framer Motion (lightbox zoom + fade, hover lift kartu) |
| Backend | Supabase — Auth, Postgres + **RLS ketat**, Storage, Realtime |
| PDF | `@react-pdf/renderer` (kop surat + TTD Kadis + QR) |
| QR | `qrcode` (server/PDF) + `qrcode.react` (tampilan web) |
| Deploy | GitHub → Vercel (GitHub Actions tersedia) |

> **Mode Demo**: bila `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` belum diisi, aplikasi otomatis
> memakai penyimpanan lokal (SQLite) berisi data contoh lengkap (8 jenis rekomendasi,
> akun tiap role, 8 pengajuan berbagai status) — cocok untuk uji coba tanpa Supabase.

---

## Struktur Proyek

```
├── supabase.sql                  # Skema produksi: tabel, RLS, storage policy, RPC, seed
├── docs/deploy.yml                # CI: lint + deploy Vercel
├── prisma/schema.prisma          # Skema Mode Demo (SQLite)
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing publik
│   │   ├── login/ daftar/        # Autentikasi
│   │   ├── verifikasi/[id]/      # Halaman publik cek keaslian surat (QR)
│   │   ├── (app)/dashboard/      # GRID KARTU status pengajuan + filter + lightbox
│   │   ├── (app)/pengajuan/baru/ # Formulir dinamis + unggah dokumen
│   │   ├── (app)/admin/jenis/    # CRUD master jenis rekomendasi (Super Admin)
│   │   ├── (app)/admin/pengguna/ # Kelola role & bidang (Super Admin)
│   │   ├── (app)/profil/         # Profil pengguna
│   │   └── api/                  # Route handlers (auth, pengajuan, aksi, upload, pdf, notifikasi)
│   ├── components/
│   │   ├── card-rekom.tsx        # Kartu status pengajuan (hover lift, strip warna jenis)
│   │   ├── lightbox-rekom.tsx    # LIGHTBOX: pratinjau dokumen, timeline, aksi per role, navigasi < >
│   │   ├── dashboard-client.tsx  # Grid + filter/search + realtime refresh
│   │   ├── dynamic-form.tsx      # Formulir dinamis dari persyaratan_json
│   │   ├── file-uploader.tsx     # Unggah + kompres gambar otomatis (<5MB)
│   │   ├── timeline-stepper.tsx  # Stepper vertikal tracking status
│   │   └── app-shell.tsx         # Header, nav, lonceng notifikasi realtime
│   └── lib/
│       ├── supabase/             # Klien Supabase (browser + server)
│       ├── store/                # Abstraksi data: supabase-store (produksi) / demo-store
│       ├── pdf/surat.tsx         # Dokumen PDF surat rekomendasi resmi
│       ├── permissions.ts        # Matriks aksi per role & status
│       └── types.ts              # Status, role, tipe bersama
```

---

## Menjalankan Secara Lokal (Mode Demo)

```bash
cp .env.example .env      # boleh kosong dulu -> Mode Demo
bun install
bun run db:push           # siapkan SQLite demo
bun run dev               # http://localhost:3000
```

Masuk dengan akun demo (kata sandi: `demo1234`):

| Role | Email |
| --- | --- |
| Pemohon | `pemohon@dinkes.go.id` |
| Verifikator SDMK | `verifikator.sdmk@dinkes.go.id` |
| Verifikator Yankes | `verifikator.yankes@dinkes.go.id` |
| Verifikator Farmalkes | `verifikator.farmalkes@dinkes.go.id` |
| Admin TU | `admin.tu@dinkes.go.id` |
| Kabid | `kabid@dinkes.go.id` |
| Kepala Dinas | `kadis@dinkes.go.id` |
| Super Admin | `superadmin@dinkes.go.id` |

---

## Setup Produksi Supabase

1. **Buat proyek Supabase** di [supabase.com](https://supabase.com).
2. **Jalankan skema**: Dashboard → *SQL Editor* → paste seluruh isi [`supabase.sql`](./supabase.sql) → *Run*.
   - Membuat 6 tabel + trigger + fungsi RLS + RPC `generate_nomor_surat` & `verify_surat_public`
   - Membuat bucket Storage **`dokumen-rekom`** (privat) & **`rekom-terbit`** (baca publik)
   - Menanam 8 jenis rekomendasi awal
3. **Aktifkan Realtime** (biasanya otomatis oleh skrip): `notifications`, `pengajuan_rekom`, `tracking_status`.
4. **Buat user pertama**: Authentication → *Add user*. Lalu di SQL Editor:
   ```sql
   update public.profiles set role = 'super_admin' where email = 'email-anda@...';
   ```
5. **Salin kredensial** Project Settings → API ke `.env`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (opsional, untuk render PDF publik via QR)
6. Restart `bun run dev` — aplikasi kini memakai Supabase (mode demo nonaktif).

### Aturan RLS ringkas

- **Pemohon** hanya melihat/menyunting pengajuan miliknya sendiri.
- **Verifikator bidang** hanya melihat pengajuan pada bidangnya (SDMK/Yankes/Farmalkes/Sekretariat).
- **Admin TU / Kabid / Kadis** melihat semua (masing-masing dengan aksi terbatas: penomoran,
  persetujuan, pengesahan).
- **Super Admin** mengelola master jenis rekomendasi & role pengguna.
- Halaman `/verifikasi/[qr]` publik membaca data aman via RPC `verify_surat_public` (security definer).

---

## Alur Workflow

```
Pemohon                    Verifikator Bidang        Kabid            Admin TU           Kadis
  │ draft → diajukan  ──▶      │                     │                 │                 │
  │                            │ diverifikasi_bidang ─┴──▶ disetujui ──▶ menunggu_ttd ──▶  terbit
  │ ◀── perlu_perbaikan        │ (kembalikan)           (kabid)      (nomor otomatis)  (TTD + QR)
  │ ◀── ditolak                │
```

Setiap perpindahan status tercatat di `tracking_status` dan menimbulkan **notifikasi realtime**
ke pihak terkait.

---

## Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di Vercel: *Add New Project* → impor repo (framework: Next.js).
3. Isi Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   (opsional) `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`.
4. (Opsional CI otomatis) Salin `docs/deploy.yml` ke `.github/workflows/`, lalu tambahkan secret GitHub: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
   — workflow [`docs/deploy.yml`](./docs/deploy.yml) akan lint lalu deploy produksi setiap push ke `main`.

---

## Keamanan Upload

- Maksimal **5 MB** per berkas; gambar dikompres otomatis di sisi klien (canvas, JPEG quality 0.82).
- Bucket `dokumen-rekom` privat — akses baca via signed URL setelah pemeriksaan RLS.
- Bucket `rekom-terbit` baca publik untuk unduhan surat resmi yang telah terbit.
