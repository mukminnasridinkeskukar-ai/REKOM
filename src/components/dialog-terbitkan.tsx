"use client";

// Dialog "Tanda Tangan & Terbitkan" untuk Kepala Dinas.
// Berkas surat terbit WAJIB berasal dari Storage bucket "rekom-terbit":
//  - pilih dari daftar berkas yang sudah ada di folder (mis. diunggah via Supabase Dashboard), atau
//  - unggah scan/PDF hasil tanda tangan langsung dari dialog ini (masuk ke rekom-terbit/{kode}/).
// Mode Demo (tanpa Supabase): unggah via /api/upload seperti dokumen pendukung.
import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, HardDriveUpload, Loader2, CheckCircle2, RefreshCcw, TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";
import { namaAmanBerkas } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BerkasTerbit {
  path: string; // path lengkap di bucket rekom-terbit
  nama: string;
  ukuran: number;
  createdAt: string | null;
}

function formatUkuran(b: number): string {
  if (!b) return "-";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function tanggalSingkat(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

const MAX_BYTES = 20 * 1024 * 1024; // 20MB

export function DialogTerbitkan({
  open,
  onOpenChange,
  pengajuanId,
  kode,
  judul,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pengajuanId: string;
  kode: string;
  judul: string;
  busy: boolean;
  /** dipanggil dengan path berkas terpilih di bucket rekom-terbit */
  onSubmit: (fileTerbit: string) => void;
}) {
  const [daftar, setDaftar] = useState<BerkasTerbit[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [unggah, setUnggah] = useState(false);
  const [terpilih, setTerpilih] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const muatDaftar = useCallback(async () => {
    if (!open) return;
    if (!isSupabaseConfigured()) return; // mode demo: tidak ada daftar storage
    setMemuat(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      const st = supabase.storage.from("rekom-terbit");
      const hasil: BerkasTerbit[] = [];
      const { data: root, error } = await st.list("", {
        limit: 100,
        sortBy: { column: "created_at", ascending: false },
      });
      if (error) throw new Error(error.message);
      for (const it of root ?? []) {
        const md = (it as unknown as { metadata?: { size?: number } | null }).metadata ?? null;
        if (md) {
          // berkas di akar folder
          hasil.push({
            path: it.name,
            nama: it.name,
            ukuran: md.size ?? 0,
            createdAt: (it as unknown as { created_at?: string }).created_at ?? null,
          });
        } else {
          // subfolder (mis. RK-2026-XXXX/) — tampilkan isinya
          const { data: anak } = await st.list(it.name, {
            limit: 100,
            sortBy: { column: "created_at", ascending: false },
          });
          for (const a of anak ?? []) {
            const mdA = (a as unknown as { metadata?: { size?: number } | null }).metadata ?? null;
            if (!mdA) continue;
            hasil.push({
              path: `${it.name}/${a.name}`,
              nama: a.name,
              ukuran: mdA.size ?? 0,
              createdAt: (a as unknown as { created_at?: string }).created_at ?? null,
            });
          }
        }
      }
      setDaftar(hasil);
    } catch (e) {
      toast.error(`Gagal memuat daftar berkas rekom-terbit: ${(e as Error).message}`);
      setDaftar([]);
    } finally {
      setMemuat(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setTerpilih(null);
      muatDaftar();
    }
  }, [open, muatDaftar]);

  const unggahBerkas = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("Ukuran berkas melebihi 20MB.");
      return;
    }
    setUnggah(true);
    try {
      let path = "";
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        if (!supabase) throw new Error("Storage belum siap.");
        path = `${kode}/${Date.now()}-${namaAmanBerkas(file.name)}`;
        const { error } = await supabase.storage.from("rekom-terbit").upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
        if (error) throw new Error(error.message);
      } else {
        // Mode Demo
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? "Gagal mengunggah berkas");
        path = String(json?.data?.fileUrl ?? "");
      }
      toast.success("Berkas terunggah ke folder rekom-terbit.");
      setTerpilih(path);
      await muatDaftar();
    } catch (e) {
      const pesan = (e as Error).message || "Gagal mengunggah berkas.";
      toast.error(
        /row-level security|policy/i.test(pesan)
          ? "Unggah ditolak Storage — pastikan SQL supabase-rekom-terbit.sql sudah dijalankan di Supabase."
          : pesan
      );
    } finally {
      setUnggah(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const kirim = () => {
    if (!terpilih) {
      toast.error("Pilih dulu berkas surat hasil tanda tangan.");
      return;
    }
    onSubmit(terpilih);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="size-4.5 text-emerald-600" /> Terbitkan Surat Rekomendasi
          </DialogTitle>
          <DialogDescription className="text-left leading-relaxed">
            <span className="font-medium text-slate-600">{kode}</span> — {judul}
            <br />
            Pilih berkas surat hasil tanda tangan dari folder <b>rekom-terbit</b>, atau unggah scan/PDF
            hasil tanda tangan. Berkas inilah yang akan tampil di akun pemohon.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) unggahBerkas(f);
          }}
        />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={unggah || busy}
              onClick={() => inputRef.current?.click()}
            >
              {unggah ? <Loader2 className="size-4 animate-spin" /> : <HardDriveUpload className="size-4" />}
              Unggah Berkas Hasil TTD
            </Button>
            {isSupabaseConfigured() && (
              <Button type="button" size="sm" variant="ghost" disabled={memuat} onClick={muatDaftar}>
                {memuat ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                Muat Ulang
              </Button>
            )}
          </div>

          {isSupabaseConfigured() ? (
            <div className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Berkas di folder rekom-terbit
              </div>
              {memuat ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Memuat daftar berkas...
                </div>
              ) : daftar.length === 0 ? (
                <div className="space-y-1 px-3 py-6 text-center">
                  <TriangleAlert className="mx-auto size-6 text-amber-500" />
                  <p className="text-sm font-medium text-slate-600">Belum ada berkas di folder rekom-terbit.</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Unggah scan/PDF hasil tanda tangan lewat tombol di atas, atau unggah manual via Supabase
                    Dashboard → Storage → rekom-terbit, lalu klik Muat Ulang.
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="divide-y divide-slate-100">
                    {daftar.map((b) => (
                      <button
                        key={b.path}
                        type="button"
                        onClick={() => setTerpilih(b.path)}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50",
                          terpilih === b.path && "bg-emerald-50"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                            terpilih === b.path ? "border-emerald-600" : "border-slate-300"
                          )}
                        >
                          {terpilih === b.path && <span className="size-2 rounded-full bg-emerald-600" />}
                        </span>
                        <FileText className="size-4 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-slate-700">{b.nama}</span>
                          <span className="block text-[10.5px] text-muted-foreground">
                            {b.path.split("/").length > 1 ? `${b.path.split("/")[0]} · ` : ""}
                            {formatUkuran(b.ukuran)}
                            {b.createdAt ? ` · ${tanggalSingkat(b.createdAt)}` : ""}
                          </span>
                        </span>
                        {terpilih === b.path && (
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          ) : (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              Mode Demo: berkas akan diunggah ke penyimpanan lokal server.
            </p>
          )}

          {terpilih && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-800">
              Berkas terpilih: <span className="break-all font-mono text-[11px]">{terpilih}</span>
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-teal-brand hover:bg-teal-brand/90"
              disabled={busy || unggah || !terpilih}
              onClick={kirim}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Terbitkan dengan Berkas Ini
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
