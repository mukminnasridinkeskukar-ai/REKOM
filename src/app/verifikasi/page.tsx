"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, FileSearch, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isSupabaseConfigured } from "@/lib/config";

export default function VerifikasiHomePage() {
  const router = useRouter();
  const [kode, setKode] = useState("");

  const cari = (e: React.FormEvent) => {
    e.preventDefault();
    // terima QR id mentah maupun URL penuh
    const m = kode.match(/verifikasi\/([0-9a-fA-F-]{8,})/) ?? kode.match(/^([0-9a-fA-F-]{8,})$/);
    const id = m ? m[1] : kode.trim();
    if (id) router.push(`/verifikasi/${encodeURIComponent(id)}`);
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

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-teal-50-brand text-teal-brand">
              <FileSearch className="size-7" />
            </span>
            <h1 className="mt-4 text-center text-xl font-bold text-slate-800 sm:text-2xl">
              Verifikasi Keaslian Surat Rekomendasi
            </h1>
            <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
              Pindai QR Code yang tertera pada surat, atau masukkan kode verifikasi di bawah ini untuk
              memastikan surat benar-benar diterbitkan oleh Dinas Kesehatan Kabupaten Kutai Kartanegara.
            </p>
            <form className="mt-6 flex gap-2" onSubmit={cari}>
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
        E-REKOM — Dinas Kesehatan Kabupaten Kutai Kartanegara
      </footer>
    </div>
  );
}
