"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABEL } from "@/lib/types";
import type { MeDTO } from "@/lib/types";

interface ProfilFull extends MeDTO {
  nik: string | null;
  noHp: string | null;
  asalInstansi: string | null;
  jabatan: string | null;
}

export default function ProfilPage() {
  const [me, setMe] = useState<ProfilFull | null>(null);
  const [form, setForm] = useState({ namaLengkap: "", nik: "", noHp: "", asalInstansi: "", jabatan: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.user) {
          const u = j.user as ProfilFull & { nik?: string; noHp?: string; asalInstansi?: string; jabatan?: string };
          setMe(u);
          setForm({
            namaLengkap: u.namaLengkap ?? "",
            nik: u.nik ?? "",
            noHp: u.noHp ?? "",
            asalInstansi: u.asalInstansi ?? "",
            jabatan: u.jabatan ?? "",
          });
        }
      });
  }, []);

  const simpan = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal menyimpan");
      toast.success("Profil berhasil diperbarui.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!me) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Memuat...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Profil Saya</h1>
        <p className="text-sm text-muted-foreground">Perbarui data diri dan informasi instansi Anda.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-4">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-teal-brand text-xl font-extrabold text-white">
            {me.namaLengkap.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase()}
          </span>
          <div>
            <p className="font-bold">{me.namaLengkap}</p>
            <p className="text-sm text-muted-foreground">{me.email}</p>
            <span className="mt-1 inline-block rounded-full bg-teal-50-brand px-2.5 py-0.5 text-xs font-medium text-teal-brand">
              {ROLE_LABEL[me.role]}
              {me.bidang ? ` · ${me.bidang}` : ""}
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-sm">Nama Lengkap</Label>
            <Input value={form.namaLengkap} onChange={(e) => setForm({ ...form, namaLengkap: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">NIK</Label>
            <Input value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">No. HP</Label>
            <Input value={form.noHp} onChange={(e) => setForm({ ...form, noHp: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Asal Instansi</Label>
            <Input value={form.asalInstansi} onChange={(e) => setForm({ ...form, asalInstansi: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Jabatan / Profesi</Label>
            <Input value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={simpan} disabled={busy || !form.namaLengkap.trim()} className="bg-brand">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Simpan Perubahan
          </Button>
        </div>
      </div>
    </div>
  );
}
