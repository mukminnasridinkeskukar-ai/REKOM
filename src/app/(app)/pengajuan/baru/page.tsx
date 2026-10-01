"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  SendHorizonal,
  Save,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JenisIcon } from "@/components/jenis-icon";
import { DynamicForm } from "@/components/dynamic-form";
import { FileUploader, type FileTerpilih } from "@/components/file-uploader";
import { unggahBerkas } from "@/lib/upload-client";
import type { JenisRekomDTO, Persyaratan } from "@/lib/types";
import { cn } from "@/lib/utils";

const LANGKAH = ["Pilih Jenis Rekomendasi", "Isi Formulir", "Unggah Dokumen"];

export default function PengajuanBaruPage() {
  const router = useRouter();
  const [langkah, setLangkah] = useState(0);
  const [jenisList, setJenisList] = useState<JenisRekomDTO[]>([]);
  const [jenisDipilih, setJenisDipilih] = useState<JenisRekomDTO | null>(null);
  const [judul, setJudul] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [berkas, setBerkas] = useState<FileTerpilih[]>([]);
  const [busy, setBusy] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/jenis")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => setJenisList(j.data ?? []))
      .catch(() => undefined);
  }, []);

  // Normalisasi hasil parse: fields & dokumen dijamin array agar UI tak pernah crash
  const persyaratan: Persyaratan = useMemo(() => {
    try {
      const p = JSON.parse(jenisDipilih?.persyaratanJson ?? "{}") as Partial<Persyaratan> | null;
      return {
        fields: Array.isArray(p?.fields) ? p.fields : [],
        dokumen: Array.isArray(p?.dokumen) ? p.dokumen : [],
      };
    } catch {
      return { fields: [], dokumen: [] };
    }
  }, [jenisDipilih]);

  const kebutuhanDokumen = persyaratan.dokumen?.map((d) => d.nama) ?? [];

  const formValid = persyaratan.fields
    .filter((f) => f.required)
    .every((f) => (form[f.key] ?? "").trim().length > 0);

  const mulaiUlang = () => {
    setLangkah(0);
    setJenisDipilih(null);
    setJudul("");
    setForm({});
    setBerkas([]);
    setDraftId(null);
  };

  const simpan = async (langsungAjukan: boolean) => {
    setBusy(true);
    try {
      // 1. buat draft bila belum ada
      let id = draftId;
      if (!id) {
        const res = await fetch("/api/pengajuan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jenisId: jenisDipilih?.id,
            judulPengajuan: judul,
            dataFormJson: JSON.stringify(form),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        id = json.data.id as string;
        setDraftId(id);
      } else {
        const res = await fetch(`/api/pengajuan/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ judulPengajuan: judul, dataFormJson: JSON.stringify(form) }),
        });
        if (!res.ok) throw new Error("Gagal memperbarui formulir");
      }

      // 2. simpan metadata dokumen — unggah bila belum ada di Storage
      for (const b of berkas) {
        if (!b.file && !b.terunggah) continue; // tidak ada berkas baru (sudah tersimpan / dokumen lama)

        let muatan: { fileUrl: string; tipeFile: string; ukuran: number };
        if (b.terunggah && b.fileUrl) {
          // FileUploader sudah mengunggah ke Storage Supabase — cukup catat metadata
          muatan = {
            fileUrl: b.fileUrl,
            tipeFile: b.tipeFile ?? "application/octet-stream",
            ukuran: b.ukuran ?? 0,
          };
        } else if (b.file) {
          muatan = await unggahBerkas(b.file, id);
        } else {
          continue;
        }

        const resDok = await fetch(`/api/pengajuan/${id}/dokumen`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ namaDokumen: b.namaDokumen, ...muatan }),
        });
        if (!resDok.ok) throw new Error("Gagal menyimpan metadata dokumen");
        b.file = undefined as never;
        b.terunggah = false;
        b.fileUrl = muatan.fileUrl;
      }

      // 3. ajukan bila diminta
      if (langsungAjukan) {
        const res = await fetch(`/api/pengajuan/${id}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "submit" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Gagal mengajukan");
        toast.success("Pengajuan berhasil dikirim!");
        router.push("/dashboard");
      } else {
        toast.success("Draft pengajuan tersimpan.");
        router.push("/dashboard");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Pengajuan Rekomendasi Baru</h1>
        <p className="text-sm text-muted-foreground">
          Lengkapi tiga langkah berikut untuk mengajukan surat rekomendasi.
        </p>
      </div>

      {/* stepper */}
      <ol className="flex items-center gap-2">
        {LANGKAH.map((l, i) => (
          <li key={l} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                i < langkah
                  ? "bg-emerald-500 text-white"
                  : i === langkah
                    ? "bg-brand text-white"
                    : "bg-slate-100 text-slate-400"
              )}
            >
              {i < langkah ? <Check className="size-4" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden text-xs font-medium sm:block",
                i === langkah ? "text-brand" : "text-slate-400"
              )}
            >
              {l}
            </span>
            {i < LANGKAH.length - 1 && <span className="h-0.5 flex-1 rounded bg-slate-100" />}
          </li>
        ))}
      </ol>

      {/* ===== LANGKAH 0: pilih jenis ===== */}
      {langkah === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3 sm:grid-cols-2">
          {jenisList.map((j) => (
            <button
              key={j.id}
              onClick={() => {
                setJenisDipilih(j);
                setLangkah(1);
              }}
              className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
            >
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${j.warna}14`, color: j.warna }}
              >
                <JenisIcon icon={j.icon} className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-700 group-hover:text-brand">
                  {j.namaJenis}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{j.deskripsi}</span>
                <span className="mt-1.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  Bidang {j.bidang}
                </span>
              </span>
            </button>
          ))}
        </motion.div>
      )}

      {/* ===== LANGKAH 1: formulir ===== */}
      {langkah === 1 && jenisDipilih && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand-50/60 p-4">
            <span
              className="flex size-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${jenisDipilih.warna}14`, color: jenisDipilih.warna }}
            >
              <JenisIcon icon={jenisDipilih.icon} className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-brand">{jenisDipilih.namaJenis}</p>
              <p className="text-xs text-muted-foreground">{jenisDipilih.deskripsi}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4">
              <Label htmlFor="judul" className="mb-1.5 block text-sm">
                Judul Pengajuan <span className="text-red-500">*</span>
              </Label>
              <Input
                id="judul"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder={`Contoh: ${jenisDipilih.namaJenis} - ${"Nama Anda"}`}
              />
            </div>
            <DynamicForm
              fields={persyaratan.fields ?? []}
              values={form}
              onChange={(k, v) => setForm((prev) => ({ ...prev, [k]: v }))}
            />
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setLangkah(0)}>
              <ArrowLeft className="size-4" /> Ganti jenis
            </Button>
            <Button
              disabled={!judul.trim() || !formValid}
              onClick={() => setLangkah(2)}
              className="bg-brand"
            >
              Lanjut: Unggah Dokumen <ArrowRight className="size-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* ===== LANGKAH 2: unggah dokumen ===== */}
      {langkah === 2 && jenisDipilih && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
              <FileText className="size-4 text-brand" /> Dokumen Persyaratan
            </p>
            <p className="mb-4 text-xs text-muted-foreground">
              Unggah dokumen berikut sesuai persyaratan {jenisDipilih.namaJenis}.
            </p>
            <FileUploader kebutuhan={kebutuhanDokumen} nilai={berkas} onChange={setBerkas} />
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="ghost" onClick={() => setLangkah(1)}>
              <ArrowLeft className="size-4" /> Kembali
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" disabled={busy} onClick={() => simpan(false)}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Simpan Draft
              </Button>
              <Button disabled={busy} onClick={() => simpan(true)} className="bg-teal-brand hover:bg-teal-brand/90">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />} Ajukan Sekarang
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {draftId && langkah > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          <button onClick={mulaiUlang} className="underline">
            Mulai pengajuan baru dari awal
          </button>
        </p>
      )}
    </div>
  );
}
