"use client";

import { motion } from "framer-motion";
import { CalendarDays, FileCheck2, Paperclip } from "lucide-react";
import { JenisIcon } from "@/components/jenis-icon";
import { StatusBadge } from "@/components/status-badge";
import type { PengajuanDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export function tanggalSingkat(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CardRekom({
  pengajuan,
  index,
  aktif,
  onClick,
}: {
  pengajuan: PengajuanDTO;
  index: number;
  aktif: boolean;
  onClick: () => void;
}) {
  const jenis = pengajuan.jenis;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.3), ease: "easeOut" }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "group relative flex w-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm",
        "transition-shadow hover:shadow-lg hover:shadow-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
        aktif && "ring-2 ring-brand/60 border-brand/40"
      )}
    >
      {/* strip warna jenis */}
      <span
        className="absolute inset-x-5 top-0 h-1 rounded-b-full"
        style={{ backgroundColor: jenis?.warna ?? "#0F766E" }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${jenis?.warna ?? "#0F766E"}14`, color: jenis?.warna ?? "#0F766E" }}
          >
            <JenisIcon icon={jenis?.icon ?? "FileText"} className="size-5.5" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-semibold tracking-wide text-slate-400">
              {pengajuan.kode}
            </p>
            <p className="max-w-52 truncate text-sm font-semibold text-slate-700">
              {jenis?.namaJenis ?? "Jenis Rekomendasi"}
            </p>
          </div>
        </div>
        <StatusBadge status={pengajuan.status} />
      </div>

      <p className="mt-3.5 line-clamp-2 min-h-10 text-sm leading-snug text-slate-600">
        {pengajuan.judulPengajuan}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {tanggalSingkat(pengajuan.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Paperclip className="size-3.5" />
            {pengajuan.dokumen.length}
          </span>
          {pengajuan.status === "terbit" && (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
              <FileCheck2 className="size-3.5" />
              QR Terbit
            </span>
          )}
        </div>
        <span className="text-[11px] font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
          Buka detail →
        </span>
      </div>
    </motion.button>
  );
}
