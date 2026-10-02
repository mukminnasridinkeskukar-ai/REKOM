"use client";

import { useRef, useState } from "react";
import { CloudUpload, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { folderPemohon, profilSaya } from "@/lib/upload-client";
import { cn } from "@/lib/utils";

export interface FileTerpilih {
  namaDokumen: string;
  file?: File;
  /** url setelah upload (demo: /api/files/..., supabase: path storage) */
  fileUrl?: string;
  tipeFile?: string;
  ukuran?: number;
  id?: string;
  /** true bila berkas SUDAH diunggah ke Storage Supabase oleh uploader ini */
  terunggah?: boolean;
}

/** Kompres gambar di sisi klien agar di bawah 5MB */
async function kompresGambar(file: File, maxDim = 2200, kualitas = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= 1.5 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const skala = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * skala);
    const h = Math.round(bitmap.height * skala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type === "image/png" ? "image/png" : "image/jpeg", kualitas)
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export function FileUploader({
  kebutuhan, // daftar dokumen yang diminta (nama)
  nilai, // FileTerpilih[] untuk pengajuan ini
  pengajuanId, // opsional (mode supabase butuh path)
  onChange,
}: {
  kebutuhan: string[];
  nilai: FileTerpilih[];
  pengajuanId?: string;
  onChange: (files: FileTerpilih[]) => void;
}) {
  const [uploading, setUploading] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<string>("");

  const kebutuhanSemua = kebutuhan.length > 0 ? kebutuhan : ["Dokumen pendukung"];

  const unggah = async (target: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`${file.name} melebihi 5MB. Mohon kompres terlebih dahulu.`);
      return;
    }
    setUploading(target);
    try {
      const fileFinal = await kompresGambar(file);
      const record: FileTerpilih = {
        namaDokumen: target,
        file: fileFinal,
        tipeFile: fileFinal.type || "application/octet-stream",
        ukuran: fileFinal.size,
      };

      if (isSupabaseConfigured()) {
        const supabase = createClient();
        if (supabase) {
          // Penataan per-folder pemohon (selaras upload-client):
          //   {Nama-Pemohon--id8}/{idPengajuan | "pra-pengajuan"}/{timestamp}-{nama-berkas}
          // Pengajuan baru belum punya ID saat unggah -> segmen "pra-pengajuan".
          const profil = await profilSaya();
          if (!profil?.id) {
            throw new Error(
              "Sesi berakhir — silakan masuk ulang, lalu unggah ulang berkas ini."
            );
          }
          const folder = folderPemohon(profil.nama, profil.id);
          const path = `${folder}/${pengajuanId ?? "pra-pengajuan"}/${Date.now()}-${fileFinal.name}`;
          const { error } = await supabase.storage.from("dokumen-rekom").upload(path, fileFinal, {
            contentType: record.tipeFile,
            upsert: false,
          });
          if (error) throw new Error(error.message);
          record.fileUrl = path;
          record.terunggah = true; // sudah permanen di Storage — halaman tak perlu unggah ulang
        }
      } else {
        const form = new FormData();
        form.append("file", fileFinal);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Gagal mengunggah");
        record.fileUrl = json.data.fileUrl;
      }

      // simpan ke server demo bila sudah ada pengajuanId (mode edit)
      onChange([...nilai.filter((n) => n.namaDokumen !== target), record]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const hapus = async (target: string) => {
    const rec = nilai.find((n) => n.namaDokumen === target);
    if (rec?.fileUrl && isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase?.storage.from("dokumen-rekom").remove([rec.fileUrl]);
    }
    if (rec?.id) {
      await fetch(`/api/pengajuan/dokumen/${rec.id}`, { method: "DELETE" }).catch(() => undefined);
    }
    onChange(nilai.filter((n) => n.namaDokumen !== target));
  };

  return (
    <div className="space-y-3">
      {kebutuhanSemua.map((k) => {
        const ada = nilai.find((n) => n.namaDokumen === k);
        return (
          <div
            key={k}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-dashed p-3 transition-colors",
              ada ? "border-emerald-300 bg-emerald-50/50" : "border-slate-300 bg-slate-50"
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                ada ? "bg-emerald-100 text-emerald-600" : "bg-brand-50 text-brand"
              )}
            >
              {ada ? <FileText className="size-5" /> : <CloudUpload className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{k}</p>
              {ada ? (
                <p className="text-xs text-emerald-700">
                  {ada.file ? ada.file.name : "tersimpan"} ·{" "}
                  {ada.ukuran ? `${(ada.ukuran / 1024).toFixed(0)} KB` : "siap"}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">PDF/JPG/PNG maksimal 5MB (gambar dikompres otomatis)</p>
              )}
            </div>
            {uploading === k ? (
              <Loader2 className="size-5 animate-spin text-brand" />
            ) : ada ? (
              <button
                type="button"
                onClick={() => hapus(k)}
                className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                aria-label={`Hapus ${k}`}
              >
                <Trash2 className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  targetRef.current = k;
                  inputRef.current?.click();
                }}
                className="rounded-lg border border-brand/30 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-50"
              >
                Pilih berkas
              </button>
            )}
          </div>
        );
      })}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && targetRef.current) unggah(targetRef.current, f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
