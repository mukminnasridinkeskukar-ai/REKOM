"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  BadgeCheck,
  CalendarDays,
  Download,
  FileSearch,
  FileText,
  Fingerprint,
  Loader2,
  QrCode,
  ShieldCheck,
  UserRound,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isSupabaseConfigured } from "@/lib/config";
import type { SuratNikDTO } from "@/lib/store";

const tanggalID = (iso: string) =>
  iso
    ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "-";

export default function VerifikasiHomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"qr" | "nik">("qr");

  // tab QR
  const [kode, setKode] = useState("");
  // tab NIK
  const [nik, setNik] = useState("");
  const [cari, setCari] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sudahCari, setSudahCari] = useState(false);
  const [hasil, setHasil] = useState<SuratNikDTO[]>([]);

  const cariQr = (e: React.FormEvent) => {
    e.preventDefault();
    // terima QR id mentah maupun URL penuh
    const m = kode.match(/verifikasi\/([0-9a-fA-F-]{8,})/) ?? kode.match(/^([0-9a-fA-F-]{8,})$/);
    const id = m ? m[1] : kode.trim();
    if (id) router.push(`/verifikasi/${encodeURIComponent(id)}`);
  };

  const cariNik = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalat(null);
    if (nik.replace(/\D/g, "").length !== 16) {
      setGalat("NIK harus 16 digit angka sesuai KTP.");
      return;
    }
    setCari(true);
    try {
      const res = await fetch("/api/verifikasi-nik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nik }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Gagal memverifikasi. Coba lagi nanti.");
      setHasil(json.data ?? []);
      setSudahCari(true);
    } catch (err) {
      setGalat((err as Error).message);
      setHasil([]);
    } finally {
      setCari(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
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
            <Link href="/dashboard">Masuk Sistem</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-teal-50-brand text-teal-brand">
              <FileSearch className="size-7" />
            </span>
            <h1 className="mt-4 text-center text-xl font-bold text-slate-800 sm:text-2xl">
              Verifikasi Keaslian Surat Rekomendasi
            </h1>
            <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
              Pastikan surat benar-benar diterbitkan oleh Dinas Kesehatan Kabupaten Kutai
              Kartanegara — lewat pemindaian QR Code pada surat atau NIK pemohon.
            </p>

            {/* Tab pemilih metode */}
            <div className="mx-auto mt-6 grid w-full max-w-sm grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setTab("qr")}
                aria-pressed={tab === "qr"}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  tab === "qr" ? "bg-white text-teal-brand shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <QrCode className="size-4" /> Kode QR
              </button>
              <button
                type="button"
                onClick={() => setTab("nik")}
                aria-pressed={tab === "nik"}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  tab === "nik" ? "bg-white text-teal-brand shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Fingerprint className="size-4" /> NIK Pemohon
              </button>
            </div>

            {tab === "qr" ? (
              <div className="mt-6">
                <form className="flex gap-2" onSubmit={cariQr}>
                  <Input
                    value={kode}
                    onChange={(e) => setKode(e.target.value)}
                    placeholder="Tempelkan kode verifikasi / URL QR..."
                    className="flex-1"
                    aria-label="Kode verifikasi"
                  />
                  <Button type="submit" className="bg-teal-brand hover:bg-teal-brand/90">
                    Periksa
                  </Button>
                </form>
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  {isSupabaseConfigured()
                    ? "Kode verifikasi tercetak di sudut kiri bawah setiap surat rekomendasi."
                    : "Mode Demo — buka pengajuan berstatus Terbit di dashboard, lalu salin URL /verifikasi/... untuk dicoba."}
                </p>
              </div>
            ) : (
              <div className="mt-6">
                <form className="flex gap-2" onSubmit={cariNik}>
                  <Input
                    value={nik}
                    onChange={(e) => setNik(e.target.value.replace(/\D/g, "").slice(0, 16))}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Masukkan NIK pemohon (16 digit)..."
                    className="flex-1 font-mono tracking-widest"
                    aria-label="NIK pemohon"
                  />
                  <Button type="submit" disabled={cari} className="bg-teal-brand hover:bg-teal-brand/90">
                    {cari ? <Loader2 className="size-4 animate-spin" /> : "Periksa"}
                  </Button>
                </form>
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  NIK adalah nomor 16 digit pada KTP pemohon yang tercantum dalam pengajuan.
                </p>

                {galat && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {galat}
                  </div>
                )}

                {sudahCari && !galat && (
                  <div className="mt-5 space-y-4">
                    {hasil.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                        <ShieldCheck className="mx-auto size-8 text-slate-300" />
                        <p className="mt-2 text-sm font-medium text-slate-500">
                          Tidak ditemukan surat rekomendasi TERBIT untuk NIK ini.
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Pastikan NIK benar. Surat yang belum terbit tidak dapat diverifikasi.
                        </p>
                      </div>
                    ) : (
                      hasil.map((s) => (
                        <div
                          key={s.pengajuanId}
                          className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm"
                        >
                          <div className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-brand px-4 py-3 text-white">
                            <BadgeCheck className="size-5 shrink-0" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold">Surat TERVERIFIKASI Asli</p>
                              <p className="font-mono text-xs text-white/85">{s.nomorSurat}</p>
                            </div>
                          </div>
                          <div className="space-y-2 px-4 py-4 text-sm">
                            <p className="flex items-center gap-2 text-slate-700">
                              <FileText className="size-4 shrink-0 text-teal-brand" />
                              <span className="font-semibold">{s.jenisNama}</span>
                            </p>
                            <p className="flex items-center gap-2 text-slate-600">
                              <UserRound className="size-4 shrink-0 text-slate-400" />
                              {s.pemohonNama}
                              {s.asalInstansi ? ` — ${s.asalInstansi}` : ""}
                            </p>
                            <p className="flex items-center gap-2 text-slate-600">
                              <CalendarDays className="size-4 shrink-0 text-slate-400" />
                              Terbit {tanggalID(s.tglTerbit)} · ditandatangani {s.namaKadis}
                            </p>
                            {s.adaBerkas ? (
                              <a
                                href={`/api/rekom-terbit/${s.pengajuanId}?nik=${encodeURIComponent(nik.replace(/\D/g, ""))}`}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-brand/90"
                              >
                                <Download className="size-4" /> Unduh Surat (PDF)
                              </a>
                            ) : (
                              <p className="mt-2 rounded-xl bg-slate-50 px-4 py-2.5 text-xs text-muted-foreground">
                                Berkas digital surat belum tersedia — silakan hubungi Admin TU Dinkes
                                Kukar.
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-brand" />
            <span>
              Surat rekomendasi resmi memiliki nomor surat berformat{" "}
              <b>440/XXX/KODE-BIDANG/Dinkes-Kukar/TAHUN</b>, tanda tangan Kepala Dinas, serta QR Code yang
              mengarah ke halaman verifikasi ini.
            </span>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-muted-foreground">
        E-REKOM — Dinas Kesehatan Kabupaten Kutai Kartanegara · Jalan Cut Nyak Dien No.33 Tenggarong 75512
      </footer>
    </div>
  );
}
