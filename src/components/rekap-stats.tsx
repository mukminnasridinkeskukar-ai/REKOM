"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, MousePointerClick, Inbox } from "lucide-react";
import type { RekapPublikDTO } from "@/lib/store";

interface StatsMini {
  totalPengajuan: number;
  terbit: number;
  diajukan: number;
  totalJenis: number;
}
interface JenisMini {
  id: string;
  namaJenis: string;
  warna: string;
}

type Tab = "total" | "terbit" | "verif" | "jenis";

const JUDUL: Record<Tab, string> = {
  total: "Total Pengajuan",
  terbit: "Surat Terbit",
  verif: "Menunggu Verifikasi",
  jenis: "Jumlah per Jenis Rekomendasi",
};

const DESKRIPSI: Record<Tab, string> = {
  total: "Seluruh pengajuan yang tercatat di platform.",
  terbit: "Pengajuan yang surat rekomendasinya telah terbit.",
  verif: "Pengajuan yang sedang menunggu verifikasi bidang.",
  jenis: "Jumlah pengajuan untuk setiap jenis rekomendasi.",
};

export function RekapStats({
  stats,
  rekap,
  jenis,
}: {
  stats: StatsMini;
  rekap: RekapPublikDTO[];
  jenis: JenisMini[];
}) {
  const [buka, setBuka] = useState<Tab | null>(null);
  const [q, setQ] = useState("");

  const baris = useMemo(() => {
    if (!buka || buka === "jenis") return [];
    const saring = rekap.filter((r) =>
      buka === "total" ? true : buka === "terbit" ? r.status === "terbit" : r.status === "diajukan"
    );
    if (!q.trim()) return saring;
    const n = q.toLowerCase();
    return saring.filter((r) =>
      [r.namaLengkap, r.programStudi, r.puskesmasTujuan, r.fakultasUniversitas]
        .join(" ")
        .toLowerCase()
        .includes(n)
    );
  }, [buka, rekap, q]);

  const rincianJenis = useMemo(() => {
    if (buka !== "jenis") return [];
    const hitung = new Map<string, number>();
    for (const r of rekap) {
      const k = r.jenis || "Lainnya";
      hitung.set(k, (hitung.get(k) ?? 0) + 1);
    }
    const daftar = jenis.map((j) => ({
      nama: j.namaJenis,
      warna: j.warna,
      jumlah: hitung.get(j.namaJenis) ?? 0,
    }));
    for (const [k, v] of hitung) {
      if (!jenis.some((j) => j.namaJenis === k)) daftar.push({ nama: k, warna: "#64748b", jumlah: v });
    }
    return daftar.sort((a, b) => b.jumlah - a.jumlah);
  }, [buka, rekap, jenis]);

  const tutup = (o: boolean) => {
    setBuka(o ? buka : null);
    if (!o) setQ("");
  };

  const kartu: { tab: Tab; nilai: number; label: string }[] = [
    { tab: "total", nilai: stats.totalPengajuan, label: "Total Pengajuan" },
    { tab: "terbit", nilai: stats.terbit, label: "Surat Terbit" },
    { tab: "verif", nilai: stats.diajukan, label: "Menunggu Verifikasi" },
    { tab: "jenis", nilai: stats.totalJenis, label: "Jenis Rekomendasi" },
  ];

  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          {kartu.map((k) => (
            <button
              key={k.tab}
              type="button"
              onClick={() => setBuka(k.tab)}
              aria-label={`Lihat rincian ${k.label}`}
              className="group cursor-pointer rounded-2xl border border-transparent p-3 text-center transition-all hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            >
              <p className="text-3xl font-extrabold text-brand transition-transform group-hover:scale-110">
                {k.nilai}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{k.label}</p>
              <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                <MousePointerClick className="size-3" /> klik untuk rincian
              </span>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={buka !== null} onOpenChange={tutup}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-brand">{buka ? JUDUL[buka] : ""}</DialogTitle>
            <DialogDescription>{buka ? DESKRIPSI[buka] : ""}</DialogDescription>
          </DialogHeader>

          {buka === "jenis" ? (
            <div className="-mx-1 max-h-[55vh] overflow-y-auto px-1">
              {rincianJenis.length === 0 ? (
                <Kosong />
              ) : (
                <ul className="space-y-2">
                  {rincianJenis.map((j) => (
                    <li
                      key={j.nama}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3"
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: j.warna }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                        {j.nama}
                      </span>
                      <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-extrabold text-brand">
                        {j.jumlah}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari nama, prodi, puskesmas, universitas..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-brand/40"
                />
              </div>
              <div className="-mx-1 max-h-[48vh] overflow-auto px-1">
                {baris.length === 0 ? (
                  <Kosong />
                ) : (
                  <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                        <th className="py-2 pr-3 font-semibold">Nama Lengkap</th>
                        <th className="py-2 pr-3 font-semibold">Program Studi</th>
                        <th className="py-2 pr-3 font-semibold">Puskesmas Tujuan</th>
                        <th className="py-2 font-semibold">Fakultas &amp; Universitas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {baris.map((r, i) => (
                        <tr
                          key={`${r.dibuatAt}-${i}`}
                          className="border-b border-slate-50 align-top text-slate-700 odd:bg-slate-50/50"
                        >
                          <td className="py-2.5 pr-3 font-medium">{r.namaLengkap || "—"}</td>
                          <td className="py-2.5 pr-3">{r.programStudi || "—"}</td>
                          <td className="py-2.5 pr-3">{r.puskesmasTujuan || "—"}</td>
                          <td className="py-2.5">{r.fakultasUniversitas || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <p className="text-right text-[11px] text-slate-400">
                {baris.length} data
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Kosong() {
  return (
    <div className="py-12 text-center">
      <Inbox className="mx-auto size-10 text-slate-300" />
      <p className="mt-3 text-sm font-medium text-slate-500">Belum ada data.</p>
    </div>
  );
}
