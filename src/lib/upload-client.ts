"use client";

// Helper unggah berkas pendukung untuk komponen klien.
// - Mode Supabase (produksi): unggah LANGSUNG ke Storage bucket "dokumen-rekom"
//   memakai klien browser -> berkas permanen, pratinjau via signed URL.
// - Mode Demo: unggah ke /api/upload (lokal).
// Semua halaman (pengajuan baru & perbaikan) memakai helper ini agar tidak ada
// lagi jalur unggah yang menyimpan berkas hanya di filesystem sementara server.
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

export interface HasilUnggah {
  /** path storage (mode supabase) atau /api/files/{uuid.ext} (mode demo) */
  fileUrl: string;
  tipeFile: string;
  ukuran: number;
}

export async function unggahBerkas(file: File, pengajuanId?: string): Promise<HasilUnggah> {
  const tipeFile = file.type || "application/octet-stream";
  const ukuran = file.size;

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const namaAman = file.name.replace(/[?#%]+/g, "-");
      const path = `${pengajuanId ?? "tmp"}/${Date.now()}-${namaAman}`;
      const { error } = await supabase.storage.from("dokumen-rekom").upload(path, file, {
        contentType: tipeFile,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      return { fileUrl: path, tipeFile, ukuran };
    }
  }

  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "Gagal mengunggah dokumen");
  return {
    fileUrl: String(json?.data?.fileUrl ?? ""),
    tipeFile: String(json?.data?.tipeFile ?? tipeFile),
    ukuran: Number(json?.data?.ukuran ?? ukuran),
  };
}
