"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Hash,
  Image as ImageIcon,
  FileCheck2,
  UserRound,
  X,
  Building2,
  Phone,
  IdCard,
  ClipboardList,
  MessageSquareWarning,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { TimelineStepper } from "@/components/timeline-stepper";
import { tanggalSingkat } from "@/components/card-rekom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ROLE_LABEL, STATUS_META, type AksiTersedia, type MeDTO, type PengajuanDTO } from "@/lib/types";
import { LABEL_AKSI } from "@/lib/permissions";
import { isSupabaseConfigured } from "@/lib/config";
import { cn } from "@/lib/utils";

const AKSI_WARNA: Partial<Record<AksiTersedia, "default" | "destructive" | "outline" | "teal">> = {
  verifikasi: "default",
  submit: "default",
  setujui: "default",
  beri_nomor: "default",
  terbitkan: "teal",
  kembalikan: "outline",
  perbaiki: "outline",
  tolak: "destructive",
};

const AKSI_PERLU_CATATAN: AksiTersedia[] = ["kembalikan", "tolak"];

function infoDokumenUrl(fileUrl: string, dokId: string): string {
  if (fileUrl.startsWith("http") || fileUrl.startsWith("/api/")) return fileUrl;
  return `/api/files/${dokId}`;
}

export function LightboxRekom({
  daftar,
  index,
  user,
  busy,
  visible,
  onClose,
  onNavigate,
  onAksi,
}: {
  daftar: PengajuanDTO[];
  index: number;
  user: MeDTO;
  busy: boolean;
  visible: boolean;
  onClose: () => void;
  onNavigate: (idx: number) => void;
  onAksi: (id: string, aksi: AksiTersedia, catatan?: string) => void;
}) {
  const p = index >= 0 && index < daftar.length ? daftar[index] : undefined;
  const [aktifDok, setAktifDok] = useState<string | null>(null);
  const [catatan, setCatatan] = useState("");
  const [aksiTerpilih, setAksiTerpilih] = useState<AksiTersedia | null>(null);

  // reset status internal saat pindah pengajuan (pattern "adjust state during render")
  const [prevId, setPrevId] = useState<string | undefined>(p?.id);
  if (prevId !== p?.id) {
    setPrevId(p?.id);
    setAktifDok(null);
    setCatatan("");
    setAksiTerpilih(null);
  }

  const goto = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next >= 0 && next < daftar.length) onNavigate(next);
    },
    [index, daftar.length, onNavigate]
  );

  // Keyboard: ESC close, < > navigasi
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goto(1);
      else if (e.key === "ArrowLeft") goto(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goto]);

  const dataForm = useMemo(() => {
    try {
      return JSON.parse(p?.dataFormJson ?? "{}") as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [p?.dataFormJson]);

  if (!p) return null;

  const dokumenAktif = p.dokumen.find((d) => d.id === aktifDok) ?? null;
  const pdfTersedia = Boolean(p.fileRekomPdfUrl) || p.status === "terbit";
  const previewUrl = dokumenAktif ? infoDokumenUrl(dokumenAktif.fileUrl, dokumenAktif.id) : null;
  const isGambar = dokumenAktif?.tipeFile.startsWith("image/");
  const isPdf = dokumenAktif?.tipeFile.includes("pdf") ?? false;
  // Berkas warisan metode lama (path lokal) — hanya di mode Supabase isinya pasti hilang
  const berkasWarisanHilang =
    (dokumenAktif?.fileUrl.startsWith("/api/files/") ?? false) && isSupabaseConfigured();
  const pemilik = p.pemohon?.id === user.id;

  const mulaiAksi = (a: AksiTersedia) => {
    if (AKSI_PERLU_CATATAN.includes(a)) {
      setAksiTerpilih(a);
      return;
    }
    onAksi(p.id, a);
  };

  const konfirmasiCatatan = () => {
    if (aksiTerpilih && catatan.trim()) {
      onAksi(p.id, aksiTerpilih, catatan.trim());
      setAksiTerpilih(null);
      setCatatan("");
    }
  };

  return (
    <AnimatePresence mode="wait">
      {visible && p && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-6"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`Detail pengajuan ${p.kode}`}
        >
        <motion.div
          key={p.id}
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex h-full max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ===== HEADER ===== */}
          <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-brand to-teal-brand px-4 py-3 text-white sm:px-5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-white/15">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] text-white/70">{p.kode}</p>
              <p className="truncate text-sm font-semibold sm:text-base">{p.judulPengajuan}</p>
            </div>
            {p.nomorSurat && (
              <span className="hidden items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium md:inline-flex">
                <Hash className="size-3.5" />
                {p.nomorSurat}
              </span>
            )}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => goto(-1)}
                disabled={index === 0}
                className="rounded-full text-white hover:bg-white/15 hover:text-white disabled:text-white/30"
                aria-label="Pengajuan sebelumnya"
              >
                <ChevronLeft className="size-5" />
              </Button>
              <span className="min-w-12 text-center text-xs text-white/80">
                {index + 1} / {daftar.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => goto(1)}
                disabled={index >= daftar.length - 1}
                className="rounded-full text-white hover:bg-white/15 hover:text-white disabled:text-white/30"
                aria-label="Pengajuan berikutnya"
              >
                <ChevronRight className="size-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="ml-1 rounded-full text-white hover:bg-red-500/80 hover:text-white"
                aria-label="Tutup (Esc)"
              >
                <X className="size-5" />
              </Button>
            </div>
          </div>

          {/* ===== BODI ===== */}
          <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_1.05fr]">
            <div className="flex min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <ImageIcon className="size-4" /> Pratinjau Dokumen
                </p>
                {pdfTersedia && (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`/api/pengajuan/${p.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      <FileCheck2 className="size-3.5" /> PDF Resmi
                    </a>
                    <a
                      href={`/api/pengajuan/${p.id}/pdf`}
                      download
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
                    >
                      <Download className="size-3.5" /> Unduh
                    </a>
                  </div>
                )}
              </div>

              <div className="thin-scroll min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">
                {/* PDF rekom resmi bila terbit */}
                {pdfTersedia ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-3 py-2">
                      <span className="flex size-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                        <FileCheck2 className="size-3.5" />
                      </span>
                      <p className="text-xs font-semibold">
                        Surat Rekomendasi Resmi {p.nomorSurat ? `— ${p.nomorSurat}` : ""}
                      </p>
                    </div>
                    <iframe
                      src={`/api/pengajuan/${p.id}/pdf#toolbar=0&view=FitH`}
                      className="h-72 w-full bg-slate-100 sm:h-80"
                      title="Pratinjau PDF rekomendasi"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center">
                    <FileCheck2 className="mx-auto size-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-500">PDF resmi belum terbit</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Dokumen PDF dengan kop surat & QR verifikasi muncul setelah ditandatangani Kepala Dinas.
                    </p>
                  </div>
                )}

                {/* daftar dokumen pendukung */}
                <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Dokumen Pendukung ({p.dokumen.length})
                </p>
                {p.dokumen.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-muted-foreground">
                    Belum ada dokumen diunggah.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {p.dokumen.map((d) => {
                      const url = infoDokumenUrl(d.fileUrl, d.id);
                      const gambar = d.tipeFile.startsWith("image/");
                      return (
                        <button
                          key={d.id}
                          onClick={() => setAktifDok(d.id === aktifDok ? null : d.id)}
                          className={cn(
                            "group flex flex-col items-center gap-2 rounded-xl border bg-white p-2.5 text-center transition-all",
                            aktifDok === d.id
                              ? "border-brand ring-2 ring-brand/30"
                              : "border-slate-200 hover:border-brand/50 hover:shadow"
                          )}
                        >
                          {gambar ? (
                            <img src={url} alt={d.namaDokumen} className="h-16 w-full rounded-lg object-cover" />
                          ) : (
                            <span className="flex h-16 w-full items-center justify-center rounded-lg bg-brand-50 text-brand">
                              <FileText className="size-7" />
                            </span>
                          )}
                          <span className="line-clamp-2 w-full text-[10.5px] font-medium leading-tight text-slate-600">
                            {d.namaDokumen}
                          </span>
                          <a
                            href={url}
                            download
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[10px] text-teal-brand hover:underline"
                          >
                            <Download className="size-3" /> unduh
                          </a>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* viewer pratinjau aktif */}
                <AnimatePresence>
                  {dokumenAktif && previewUrl && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 overflow-hidden"
                    >
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                          <p className="truncate text-xs font-semibold">{dokumenAktif.namaDokumen}</p>
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-teal-brand"
                          >
                            <ExternalLink className="size-3" /> tab baru
                          </a>
                        </div>
                        {berkasWarisanHilang ? (
                          <div className="space-y-1.5 p-4 text-center">
                            <p className="text-xs font-semibold text-orange-600">Berkas tidak tersedia</p>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              Dokumen ini terunggah dengan metode lama sehingga berkasnya tidak tersimpan permanen.
                              {pemilik
                                ? " Silakan buka Perbaiki Pengajuan lalu unggah ulang dokumen ini."
                                : " Mohon hubungi pemohon untuk mengunggah ulang dokumen ini."}
                            </p>
                          </div>
                        ) : isGambar ? (
                          <img src={previewUrl} alt={dokumenAktif.namaDokumen} className="max-h-80 w-full object-contain" />
                        ) : isPdf ? (
                          <iframe src={`${previewUrl}#toolbar=0&view=FitH`} className="h-72 w-full" title={dokumenAktif.namaDokumen} />
                        ) : (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            Format tidak dapat dipratinjau.{" "}
                            <a href={previewUrl} download className="text-teal-brand underline">
                              Unduh berkas
                            </a>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* --- KANAN: detail, timeline, aksi --- */}
            <div className="thin-scroll min-h-0 overflow-y-auto bg-white">
              <div className="space-y-4 p-4 sm:p-5">
                {/* status */}
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={p.status} className="px-3 py-1 text-[13px]" />
                  {p.nomorSurat && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 md:hidden">
                      <Hash className="size-3" /> {p.nomorSurat}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" /> Diajukan {tanggalSingkat(p.createdAt)}
                  </span>
                </div>
                {p.status !== "terbit" && (
                  <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    {STATUS_META[p.status].deskripsi}
                  </p>
                )}

                {/* pemohon */}
                <section>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <UserRound className="size-4" /> Pemohon
                  </p>
                  <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-start">
                    <Avatar className="mx-auto size-14 shrink-0 ring-2 ring-slate-100 sm:mx-0">
                      {p.pemohon?.fotoUrl && <AvatarImage src={p.pemohon.fotoUrl} alt={p.pemohon.namaLengkap} />}
                      <AvatarFallback className="bg-gradient-to-br from-brand to-teal-brand text-sm font-extrabold text-white">
                        {(p.pemohon?.namaLengkap ?? "?")
                          .split(" ")
                          .slice(0, 2)
                          .map((s) => s[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                      {[
                        { icon: UserRound, label: "Nama", nilai: p.pemohon?.namaLengkap },
                        { icon: IdCard, label: "NIK", nilai: p.pemohon?.nik },
                        { icon: Building2, label: "Instansi", nilai: p.pemohon?.asalInstansi },
                        { icon: Phone, label: "No. HP", nilai: p.pemohon?.noHp },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center gap-2 text-sm">
                          <row.icon className="size-3.5 shrink-0 text-slate-400" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{row.label}</p>
                            <p className="truncate font-medium">{row.nilai || "-"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* data form dinamis */}
                <section>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <ClipboardList className="size-4" /> Detail Formulir
                  </p>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {Object.entries(dataForm).length === 0 && (
                      <p className="p-3 text-sm text-muted-foreground">Tidak ada data formulir.</p>
                    )}
                    {Object.entries(dataForm).map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[38%_1fr] gap-2 px-3 py-2 text-sm">
                        <span className="text-xs text-muted-foreground">
                          {k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
                        </span>
                        <span className="font-medium">{String(v ?? "-")}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* catatan verifikator */}
                {p.catatanVerifikator && (
                  <section>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <MessageSquareWarning className="size-4" /> Catatan Verifikator
                    </p>
                    <div
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-sm leading-relaxed",
                        p.status === "ditolak"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : p.status === "perlu_perbaikan"
                            ? "border-orange-200 bg-orange-50 text-orange-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                      )}
                    >
                      {p.catatanVerifikator}
                    </div>
                  </section>
                )}

                {/* timeline */}
                <section>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Timeline Tracking Status
                  </p>
                  <TimelineStepper status={p.status} tracking={p.tracking} />
                </section>

                {/* aksi sesuai role */}
                {p.aksi.length > 0 && (
                  <section className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
                    {aksiTerpilih && (
                      <div className="mb-2.5 space-y-1.5">
                        <Label htmlFor="catatan-aksi">
                          {aksiTerpilih === "tolak" ? "Alasan penolakan" : "Catatan perbaikan"} (wajib)
                        </Label>
                        <Textarea
                          id="catatan-aksi"
                          value={catatan}
                          onChange={(e) => setCatatan(e.target.value)}
                          placeholder="Tuliskan catatan yang jelas untuk pemohon..."
                          rows={3}
                        />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {p.aksi.map((a) => (
                        <Button
                          key={a}
                          size="sm"
                          variant={AKSI_WARNA[a] ?? "default"}
                          className={
                            AKSI_WARNA[a] === "teal"
                              ? "bg-teal-brand hover:bg-teal-brand/90"
                              : AKSI_WARNA[a] === "outline"
                                ? "border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                                : undefined
                          }
                          disabled={busy}
                          onClick={() => mulaiAksi(a)}
                        >
                          {LABEL_AKSI[a]}
                        </Button>
                      ))}
                      {aksiTerpilih && (
                        <>
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setAksiTerpilih(null)}>
                            Batal
                          </Button>
                          <Button
                            size="sm"
                            disabled={busy || !catatan.trim()}
                            onClick={konfirmasiCatatan}
                            className="bg-brand"
                          >
                            Kirim
                          </Button>
                        </>
                      )}
                    </div>
                    {pemilik && p.status === "perlu_perbaikan" && (
                      <a
                        href={`/pengajuan/${p.id}/perbaikan`}
                        className="mt-2 inline-block text-xs font-medium text-brand hover:underline"
                      >
                        → Buka formulir untuk memperbaiki data & berkas
                      </a>
                    )}
                  </section>
                )}
              </div>
            </div>
          </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
