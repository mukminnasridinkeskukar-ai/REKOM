import Link from "next/link";
import { Activity, BadgeCheck, CalendarDays, FileText, Hash, UserRound, XCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStore } from "@/lib/store";
import { QRCode } from "@/components/qr-code";

export const dynamic = "force-dynamic";

const tanggalID = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

export default async function VerifikasiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hasil = await getStore()
    .then((s) => s.verifySurat(id))
    .catch(() => null);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white">
              <Activity className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-extrabold text-brand">E-REKOM</span>
              <span className="block text-[10px] text-slate-500">Dinkes Kutai Kartanegara</span>
            </span>
          </Link>
          <Button asChild variant="outline" className="ml-auto rounded-full">
            <Link href="/verifikasi">Cek Kode Lain</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        {hasil ? (
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-brand px-6 py-5 text-white">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15">
                <BadgeCheck className="size-7" />
              </span>
              <div>
                <p className="text-lg font-bold">Surat TERVERIFIKASI Asli</p>
                <p className="text-sm text-white/85">
                  Diterbitkan oleh Dinas Kesehatan Kabupaten Kutai Kartanegara
                </p>
              </div>
            </div>
            <div className="space-y-4 p-6 sm:p-8">
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800">
                <Hash className="size-4" />
                <span className="font-mono text-sm font-bold tracking-wide">{hasil.nomorSurat}</span>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: FileText, label: "Jenis Rekomendasi", nilai: hasil.jenisNama },
                  { icon: UserRound, label: "Atas Nama", nilai: hasil.pemohonNama },
                  { icon: Building2, label: "Instansi / Unit", nilai: hasil.asalInstansi ?? "-" },
                  { icon: CalendarDays, label: "Tanggal Terbit", nilai: tanggalID(hasil.tglTerbit) },
                ].map((row) => (
                  <div key={row.label} className="rounded-xl border border-slate-200 p-3.5">
                    <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <row.icon className="size-3.5" /> {row.label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-700">{row.nilai}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Surat dengan judul pengajuan <b className="text-slate-600">&ldquo;{hasil.judulPengajuan}&rdquo;</b> telah
                ditandatangani secara elektronik oleh <b className="text-slate-600">{hasil.namaKadis}</b> selaku Kepala
                Dinas Kesehatan Kabupaten Kutai Kartanegara.
              </p>
              <div className="flex flex-col items-center gap-4 rounded-xl bg-slate-50 p-4 sm:flex-row">
                <QRCode value={hasil.qrCodeId} size={96} />
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-xs text-muted-foreground">
                    Kode verifikasi ini dapat dipindai ulang kapan pun untuk memastikan keaslian surat.
                  </p>
                  <p className="mt-1 break-all font-mono text-[10px] text-slate-400">{hasil.qrCodeId}</p>
                </div>
                <Button asChild className="bg-teal-brand hover:bg-teal-brand/90">
                  <a href={`/api/rekom-terbit/${hasil.pengajuanId}?qr=${hasil.qrCodeId}`} target="_blank" rel="noreferrer">
                    Lihat PDF Surat
                  </a>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <XCircle className="size-8" />
            </span>
            <h1 className="mt-4 text-xl font-bold text-slate-800">Surat Tidak Ditemukan</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Kode verifikasi <span className="break-all font-mono text-xs">{id}</span> tidak terdaftar sebagai surat
              rekomendasi yang sah. Surat belum terbit, sudah dicabut, atau bukan diterbitkan oleh sistem E-REKOM
              Dinkes Kukar. Hubungi Admin TU Dinkes Kukar bila Anda merasa ini keliru.
            </p>
            <Button asChild variant="outline" className="mt-5 rounded-full">
              <Link href="/verifikasi">Coba Kode Lain</Link>
            </Button>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-muted-foreground">
        E-REKOM — Dinas Kesehatan Kabupaten Kutai Kartanegara · Jalan Gajah Mada No. 9 Tenggarong 75512
      </footer>
    </div>
  );
}
