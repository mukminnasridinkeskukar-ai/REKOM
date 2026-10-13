"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
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

/** Warna mencolok + warna glow (triplet RGB) untuk tiap kartu */
const GAYA: Record<Tab, { grad: string; glow: string; ikon: string }> = {
  total: { grad: "from-blue-500 via-blue-600 to-indigo-700", glow: "59,130,246", ikon: "📊" },
  terbit: { grad: "from-emerald-500 via-teal-500 to-cyan-600", glow: "16,185,129", ikon: "✅" },
  verif: { grad: "from-amber-500 via-orange-500 to-red-500", glow: "249,115,22", ikon: "⏳" },
  jenis: { grad: "from-fuchsia-500 via-purple-500 to-violet-700", glow: "192,38,211", ikon: "🗂️" },
};

const daftarVar = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
};
const barisVar = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
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

  const glowAktif = buka ? GAYA[buka].glow : null;

  return (
    <section className="border-y border-slate-200 bg-gradient-to-b from-white via-slate-50 to-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-5">
          {kartu.map((k) => {
            const g = GAYA[k.tab];
            return (
              <motion.button
                key={k.tab}
                type="button"
                onClick={() => setBuka(k.tab)}
                aria-label={`Lihat rincian ${k.label}`}
                whileHover={{ y: -5, scale: 1.04 }}
                whileTap={{ scale: 0.93 }}
                className={`group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br ${g.grad} p-4 text-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:p-5`}
                animate={{
                  boxShadow: [
                    `0 4px 18px rgba(${g.glow},0.38)`,
                    `0 8px 34px rgba(${g.glow},0.62)`,
                    `0 4px 18px rgba(${g.glow},0.38)`,
                  ],
                }}
                transition={{
                  boxShadow: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
                  y: { type: "spring", stiffness: 320, damping: 18 },
                  scale: { type: "spring", stiffness: 320, damping: 18 },
                }}
              >
                {/* kilau lembut bergerak */}
                <span className="pointer-events-none absolute -left-1/2 -top-1/2 size-[200%] rotate-12 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.28),transparent_55%)] opacity-60 transition-opacity duration-300 group-hover:opacity-90" />
                {/* denyut cincin */}
                <span
                  className="pointer-events-none absolute inset-1.5 rounded-xl border border-white/40"
                  style={{ animation: "pulseCincin 2.6s ease-in-out infinite" }}
                />
                <span className="relative block text-xl" aria-hidden>
                  {g.ikon}
                </span>
                <p className="relative mt-1 text-4xl font-black tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]">
                  {k.nilai}
                </p>
                <p className="relative mt-1 text-[11px] font-bold uppercase tracking-wide text-white/95 sm:text-xs">
                  {k.label}
                </p>
                <motion.span
                  className="relative mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm"
                  animate={{ opacity: [0.65, 1, 0.65] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <MousePointerClick className="size-3" /> klik untuk rincian
                </motion.span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes pulseCincin {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.035); }
        }
      `}</style>

      <Dialog open={buka !== null} onOpenChange={tutup}>
        <DialogContent
          className="max-h-[85vh] overflow-hidden sm:max-w-3xl"
          style={
            glowAktif
              ? {
                  boxShadow: `0 0 0 1px rgba(${glowAktif},0.25), 0 24px 70px -18px rgba(${glowAktif},0.55)`,
                }
              : undefined
          }
        >
          <AnimatePresence mode="wait">
            {buka !== null && (
              <motion.div
                key={buka}
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <span
                      className="inline-flex size-8 items-center justify-center rounded-lg text-base shadow-md"
                      style={{ backgroundColor: `rgba(${glowAktif},0.14)` }}
                      aria-hidden
                    >
                      {GAYA[buka].ikon}
                    </span>
                    <span className="text-brand">{JUDUL[buka]}</span>
                  </DialogTitle>
                  <DialogDescription>{DESKRIPSI[buka]}</DialogDescription>
                </DialogHeader>

                {buka === "jenis" ? (
                  <motion.ul
                    variants={daftarVar}
                    initial="hidden"
                    animate="show"
                    className="-mx-1 max-h-[55vh] space-y-2 overflow-y-auto px-1"
                  >
                    {rincianJenis.length === 0 ? (
                      <Kosong />
                    ) : (
                      rincianJenis.map((j) => (
                        <motion.li
                          key={j.nama}
                          variants={barisVar}
                          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition-colors hover:border-slate-200"
                        >
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: j.warna, boxShadow: `0 0 8px ${j.warna}88` }}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                            {j.nama}
                          </span>
                          <motion.span
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 18 }}
                            className="rounded-full px-3 py-1 text-sm font-extrabold text-white"
                            style={{
                              backgroundColor: j.warna,
                              boxShadow: `0 2px 10px ${j.warna}66`,
                            }}
                          >
                            {j.jumlah}
                          </motion.span>
                        </motion.li>
                      ))
                    )}
                  </motion.ul>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Cari nama, prodi, puskesmas, universitas..."
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:ring-2"
                        style={{ boxShadow: `0 0 0 3px rgba(${glowAktif},0.10)` }}
                      />
                    </div>
                    <motion.div
                      key={q ? `cari-${q}` : "semua"}
                      variants={daftarVar}
                      initial="hidden"
                      animate="show"
                      className="-mx-1 max-h-[48vh] overflow-auto px-1"
                    >
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
                              <motion.tr
                                key={`${r.dibuatAt}-${i}`}
                                variants={barisVar}
                                className="border-b border-slate-50 align-top text-slate-700 odd:bg-slate-50/50"
                              >
                                <td className="py-2.5 pr-3 font-medium">{r.namaLengkap || "—"}</td>
                                <td className="py-2.5 pr-3">{r.programStudi || "—"}</td>
                                <td className="py-2.5 pr-3">{r.puskesmasTujuan || "—"}</td>
                                <td className="py-2.5">{r.fakultasUniversitas || "—"}</td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </motion.div>
                    <p className="text-right text-[11px] text-slate-400">{baris.length} data</p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
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
