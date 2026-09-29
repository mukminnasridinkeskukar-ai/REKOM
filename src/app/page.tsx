import Link from "next/link";
import {
  Activity,
  BadgeCheck,
  FileSearch,
  BellRing,
  FilePlus2,
  SearchCheck,
  PenLine,
  FileCheck2,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Suspense } from "react";
import { JenisIcon } from "@/components/jenis-icon";
import { getStore } from "@/lib/store";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

async function Hero() {
  const user = await getSessionUser();
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand to-teal-brand text-white">
      <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-teal-brand/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-gold/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
            <ShieldCheck className="size-3.5 text-gold" />
            Platform Resmi Dinas Kesehatan Kutai Kartanegara
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            E-REKOM
            <span className="mt-2 block text-lg font-semibold text-white/80 sm:text-xl">
              Tata Kelola Rekomendasi Kepala Dinas Kesehatan
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
            Ajukan surat rekomendasi apa pun — SIP tenaga kesehatan, izin klinik, apotek, fasilitasi pelatihan,
            hingga studi lanjut — sepenuhnya daring: verifikasi berkas lintas bidang, penomoran surat otomatis,
            tanda tangan Kepala Dinas, dan QR Code verifikasi keaslian.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand shadow-lg transition-transform hover:-translate-y-0.5"
            >
              {user ? "Buka Dashboard" : "Masuk / Daftar"}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/verifikasi"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <FileSearch className="size-4" /> Cek Keaslian Surat
            </Link>
          </div>
        </div>

        {/* mock kartu dashboard */}
        <div className="hidden justify-center lg:flex">
          <div className="w-96 rotate-1 rounded-2xl bg-white p-5 text-slate-800 shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white">
                <Activity className="size-5" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-brand">E-REKOM</p>
                <p className="text-[10px] text-slate-500">Dinkes Kutai Kartanegara</p>
              </div>
              <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                TERBIT
              </span>
            </div>
            <div className="mt-4 space-y-2.5">
              {[
                { warna: "#1E3A8A", icon: "Stethoscope", judul: "Rekom SIP Dokter Umum", status: "Terbit", cls: "bg-emerald-100 text-emerald-700" },
                { warna: "#0F766E", icon: "Hospital", judul: "Izin Klinik Pratama", status: "Diajukan", cls: "bg-amber-100 text-amber-700" },
                { warna: "#7C3AED", icon: "Pill", judul: "Izin Apotek Sehat Farma", status: "Verifikasi", cls: "bg-blue-100 text-blue-700" },
              ].map((k) => (
                <div key={k.judul} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                  <span className="flex size-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${k.warna}14`, color: k.warna }}>
                    <JenisIcon icon={k.icon} className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{k.judul}</p>
                    <p className="text-[10px] text-slate-400">Nomor: 440/001/SDMK/Dinkes-Kukar/2026</p>
                  </div>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold ${k.cls}`}>{k.status}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-teal-brand text-white">
                <BadgeCheck className="size-4" />
              </span>
              <p className="text-[10px] leading-snug text-slate-500">
                Scan QR pada surat → verifikasi keaslian instan di halaman publik
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

async function JenisGrid() {
  let jenis: { id: string; namaJenis: string; deskripsi: string | null; icon: string; warna: string; bidang: string }[] = [];
  try {
    const store = await getStore();
    jenis = await store.listJenis(true);
  } catch {
    jenis = [];
  }
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <h2 className="text-2xl font-extrabold text-slate-800 sm:text-3xl">Jenis Rekomendasi yang Tersedia</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
          Satu platform untuk semua kebutuhan surat rekomendasi. Super Admin dapat menambahkan jenis baru kapan
          pun tanpa perlu perubahan kode.
        </p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {jenis.map((j) => (
          <div
            key={j.id}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <span
              className="flex size-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${j.warna}14`, color: j.warna }}
            >
              <JenisIcon icon={j.icon} className="size-5.5" />
            </span>
            <p className="mt-3 text-sm font-bold text-slate-700 group-hover:text-brand">{j.namaJenis}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{j.deskripsi}</p>
            <span className="mt-3 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
              Bidang {j.bidang}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

async function Stats() {
  let s = { totalPengajuan: 0, terbit: 0, diajukan: 0, totalJenis: 0 };
  try {
    const store = await getStore();
    const data = await store.stats();
    s = { totalPengajuan: data.totalPengajuan, terbit: data.terbit, diajukan: data.diajukan, totalJenis: data.totalJenis };
  } catch {
    /* biarkan nol */
  }
  const items = [
    { nilai: s.totalPengajuan, label: "Total Pengajuan" },
    { nilai: s.terbit, label: "Surat Terbit" },
    { nilai: s.diajukan, label: "Menunggu Verifikasi" },
    { nilai: s.totalJenis, label: "Jenis Rekomendasi" },
  ];
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
        {items.map((i) => (
          <div key={i.label} className="text-center">
            <p className="text-3xl font-extrabold text-brand">{i.nilai}</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">{i.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Alur() {
  const langkah = [
    { icon: FilePlus2, judul: "Ajukan Online", isi: "Pilih jenis rekomendasi, isi formulir dinamis, unggah dokumen persyaratan." },
    { icon: SearchCheck, judul: "Verifikasi Bidang", isi: "Verifikator SDMK / Yankes / Farmalkes memeriksa berkas dan memberi catatan." },
    { icon: PenLine, judul: "Penomoran & Persetujuan", isi: "Admin TU memberi nomor surat otomatis, Kabid dan Kadis menyetujui." },
    { icon: FileCheck2, judul: "Terbit + QR", isi: "PDF resmi berkopsurat terbit dengan tanda tangan Kadis dan QR verifikasi." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <h2 className="text-2xl font-extrabold text-slate-800 sm:text-3xl">Alur Pengajuan 4 Langkah</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Dari pengajuan hingga surat terbit, seluruh proses tercatat dan dapat dipantau secara real-time.
        </p>
      </div>
      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {langkah.map((l, i) => (
          <div key={l.judul} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="absolute -top-3 left-5 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-extrabold text-amber-950">
              LANGKAH {i + 1}
            </span>
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand">
              <l.icon className="size-5.5" />
            </span>
            <p className="mt-3 font-bold text-slate-700">{l.judul}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{l.isi}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Fitur() {
  const fitur = [
    { icon: FileSearch, judul: "Verifikasi Keaslian QR", isi: "Setiap surat terbit memiliki QR unik yang dapat diverifikasi publik kapan pun." },
    { icon: BellRing, judul: "Notifikasi Realtime", isi: "Pemohon, verifikator, hingga Kadis menerima pemberitahuan pada setiap perubahan status." },
    { icon: ShieldCheck, judul: "Keamanan Berlapis", isi: "Row Level Security Supabase: pemohon hanya melihat pengajuannya sendiri." },
    { icon: Activity, judul: "Fleksibel Tanpa Koding", isi: "Master jenis rekomendasi dapat ditambah dan diubah Super Admin melalui antarmuka." },
  ];
  return (
    <section className="bg-gradient-to-br from-slate-50 to-teal-50-brand">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-slate-800 sm:text-3xl">Kenapa E-REKOM?</h2>
        </div>
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {fitur.map((f) => (
            <div key={f.judul} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="flex size-11 items-center justify-center rounded-xl bg-teal-50-brand text-teal-brand">
                <f.icon className="size-5.5" />
              </span>
              <p className="mt-3 font-bold text-slate-700">{f.judul}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.isi}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <Activity className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-extrabold tracking-tight text-brand">E-REKOM</span>
              <span className="hidden text-[10px] font-medium text-slate-500 sm:block">Dinkes Kutai Kartanegara</span>
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <Link href="/verifikasi" className="hidden rounded-full px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:inline-flex">
              Cek Surat
            </Link>
            <Link href="/login" className="rounded-full px-3.5 py-1.5 text-sm font-semibold text-brand hover:bg-brand-50">
              Masuk
            </Link>
            <Link href="/daftar" className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700">
              Daftar
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Hero />
        <Stats />
        <JenisGrid />
        <Alur />
        <Fitur />
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs leading-relaxed text-muted-foreground sm:px-6">
          <p className="font-semibold text-slate-600">E-REKOM — Dinas Kesehatan Kabupaten Kutai Kartanegara</p>
          <p className="mt-1">Jalan Gajah Mada No. 9 Tenggarong, Kutai Kartanegara, Kalimantan Timur 75512</p>
        </div>
      </footer>
    </div>
  );
}
