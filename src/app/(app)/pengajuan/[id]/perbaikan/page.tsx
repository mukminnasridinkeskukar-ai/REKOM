"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, SendHorizonal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DynamicForm } from "@/components/dynamic-form";
import { FileUploader, type FileTerpilih } from "@/components/file-uploader";
import { JenisIcon } from "@/components/jenis-icon";
import { StatusBadge } from "@/components/status-badge";
import type { PengajuanDTO, Persyaratan } from "@/lib/types";

export default function PerbaikanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [p, setP] = useState<PengajuanDTO | null>(null);
  const [judul, setJudul] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [berkas, setBerkas] = useState<FileTerpilih[]>([]);
  const [dokHapus, setDokHapus] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/pengajuan/${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          setP(j.data);
          setJudul(j.data.judulPengajuan);
          try {
            setForm(JSON.parse(j.data.dataFormJson ?? "{}"));
          } catch {
            setForm({});
          }
          setBerkas(
            (j.data.dokumen ?? []).map((d: { namaDokumen: string; fileUrl: string; tipeFile: string; ukuran: number; id: string }) => ({
              namaDokumen: d.namaDokumen,
              fileUrl: d.fileUrl,
              tipeFile: d.tipeFile,
              ukuran: d.ukuran,
              id: d.id,
            }))
          );
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const persyaratan: Persyaratan = (() => {
    try {
      return JSON.parse(p?.jenis?.persyaratanJson ?? "{}") as Persyaratan;
    } catch {
      return { fields: [], dokumen: [] };
    }
  })();

  const kebutuhan = persyaratan.dokumen?.map((d) => d.nama) ?? [];

  const ubahBerkas = (files: FileTerpilih[]) => {
    const namaLama = berkas.filter((b) => b.id).map((b) => b.namaDokumen);
    const namaBaru = files.filter((b) => b.id).map((b) => b.namaDokumen);
    const hilang = namaLama.filter((n) => !namaBaru.includes(n));
    const ids = berkas.filter((b) => hilang.includes(b.namaDokumen)).map((b) => b.id!) as string[];
    setDokHapus((prev) => [...new Set([...prev, ...ids])]);
    setBerkas(files);
  };

  const simpanDanAjukan = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/pengajuan/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judulPengajuan: judul, dataFormJson: JSON.stringify(form) }),
      });
      if (!res.ok) throw new Error("Gagal memperbarui formulir");

      for (const dokId of dokHapus) {
        await fetch(`/api/pengajuan/dokumen/${dokId}`, { method: "DELETE" });
      }

      for (const b of berkas) {
        if (!b.file) continue;
        const fd = new FormData();
        fd.append("file", b.file);
        const resUp = await fetch("/api/upload", { method: "POST", body: fd });
        const jsonUp = await resUp.json();
        if (!resUp.ok) throw new Error(jsonUp.error ?? "Gagal mengunggah dokumen");
        await fetch(`/api/pengajuan/${id}/dokumen`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            namaDokumen: b.namaDokumen,
            fileUrl: jsonUp.data.fileUrl,
            tipeFile: jsonUp.data.tipeFile,
            ukuran: jsonUp.data.ukuran,
          }),
        });
      }

      const resAksi = await fetch(`/api/pengajuan/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "perbaiki" }),
      });
      const jsonAksi = await resAksi.json();
      if (!resAksi.ok) throw new Error(jsonAksi.error ?? "Gagal mengajukan ulang");

      toast.success("Berkas diperbaiki dan diajukan ulang!");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Memuat...
      </div>
    );
  }
  if (!p) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        Pengajuan tidak ditemukan.{" "}
        <a href="/dashboard" className="text-brand underline">Kembali ke dashboard</a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Perbaiki Pengajuan</h1>
          <p className="text-sm text-muted-foreground">{p.kode} — sesuaikan data & berkas lalu ajukan ulang.</p>
        </div>
        <StatusBadge status={p.status} />
      </div>

      {p.catatanVerifikator && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm leading-relaxed text-orange-800">
          <p className="mb-0.5 font-semibold">Catatan verifikator:</p>
          {p.catatanVerifikator}
        </div>
      )}

      <div className="flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand-50/60 p-4">
        <span
          className="flex size-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${p.jenis?.warna ?? "#0F766E"}14`, color: p.jenis?.warna ?? "#0F766E" }}
        >
          <JenisIcon icon={p.jenis?.icon ?? "FileText"} className="size-5" />
        </span>
        <p className="text-sm font-semibold text-brand">{p.jenis?.namaJenis}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4">
          <Label htmlFor="judul" className="mb-1.5 block text-sm">Judul Pengajuan *</Label>
          <Input id="judul" value={judul} onChange={(e) => setJudul(e.target.value)} />
        </div>
        <DynamicForm fields={persyaratan.fields ?? []} values={form} onChange={(k, v) => setForm((prev) => ({ ...prev, [k]: v }))} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <FileUploader kebutuhan={kebutuhan} nilai={berkas} pengajuanId={id} onChange={ubahBerkas} />
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="size-4" /> Kembali
        </Button>
        <Button disabled={busy || !judul.trim()} onClick={simpanDanAjukan} className="bg-teal-brand hover:bg-teal-brand/90">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />} Perbaiki & Ajukan Ulang
        </Button>
      </div>
    </div>
  );
}
