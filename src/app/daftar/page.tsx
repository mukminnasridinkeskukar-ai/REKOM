"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, Loader2, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DaftarPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    namaLengkap: "",
    email: "",
    password: "",
    nik: "",
    noHp: "",
    asalInstansi: "",
    jabatan: "",
  });
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const daftar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Pendaftaran gagal");
      if (json.needsConfirm) {
        toast.success("Pendaftaran berhasil. Silakan cek email untuk konfirmasi akun.");
        router.push("/login");
      } else {
        toast.success("Akun berhasil dibuat!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand-950 via-brand to-teal-brand">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
          <div className="text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand text-white">
              <Activity className="size-6" />
            </span>
            <h1 className="mt-4 text-xl font-bold text-slate-800">Daftar Akun Pemohon</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Buat akun untuk mengajukan surat rekomendasi Dinkes Kukar.
            </p>
          </div>

          <form className="mt-6 space-y-3.5" onSubmit={daftar}>
            <div>
              <Label htmlFor="namaLengkap" className="mb-1.5 block text-sm">Nama Lengkap *</Label>
              <Input id="namaLengkap" required value={form.namaLengkap} onChange={set("namaLengkap")} placeholder="Nama beserta gelar" />
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <Label htmlFor="email" className="mb-1.5 block text-sm">Email *</Label>
                <Input id="email" type="email" required value={form.email} onChange={set("email")} placeholder="nama@email.com" />
              </div>
              <div>
                <Label htmlFor="password" className="mb-1.5 block text-sm">Kata Sandi *</Label>
                <Input id="password" type="password" required minLength={8} value={form.password} onChange={set("password")} placeholder="Minimal 8 karakter" />
              </div>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <Label htmlFor="nik" className="mb-1.5 block text-sm">NIK</Label>
                <Input id="nik" value={form.nik} onChange={set("nik")} placeholder="16 digit" />
              </div>
              <div>
                <Label htmlFor="noHp" className="mb-1.5 block text-sm">No. HP</Label>
                <Input id="noHp" value={form.noHp} onChange={set("noHp")} placeholder="08xx" />
              </div>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <Label htmlFor="asalInstansi" className="mb-1.5 block text-sm">Asal Instansi</Label>
                <Input id="asalInstansi" value={form.asalInstansi} onChange={set("asalInstansi")} placeholder="Puskesmas / RS / Perorangan" />
              </div>
              <div>
                <Label htmlFor="jabatan" className="mb-1.5 block text-sm">Jabatan / Profesi</Label>
                <Input id="jabatan" value={form.jabatan} onChange={set("jabatan")} placeholder="Perawat / Dokter / dll" />
              </div>
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-brand">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <UserRoundPlus className="size-4" />} Daftar
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-brand hover:underline">Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
