"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  CircleAlert,
  CircleCheckBig,
  KeyRound,
  Loader2,
  Mail,
  ShieldQuestion,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LupaAkunPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nik: "", noHp: "", password: "", konfirmasi: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sukses, setSukses] = useState<{ nama: string; email: string | null } | null>(null);

  const setNik = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, nik: e.target.value.replace(/\D/g, "").slice(0, 16) }));
  const setNoHp = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, noHp: e.target.value.replace(/\D/g, "").slice(0, 15) }));

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.nik.length !== 16) {
      setError("NIK harus 16 digit angka sesuai KTP.");
      return;
    }
    if (form.noHp.length < 9) {
      setError("Masukkan No. HP yang terdaftar (contoh: 0812xxxxxxxx).");
      return;
    }
    if (form.password.length < 8) {
      setError("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (form.konfirmasi !== form.password) {
      setError("Konfirmasi kata sandi tidak sama dengan kata sandi baru.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/lupa-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memulihkan akun.");
      setSukses({ nama: json.namaLengkap ?? "-", email: json.email ?? null });
      toast.success("Kata sandi berhasil diubah. Silakan masuk kembali.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand-950 via-brand to-teal-brand">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
          {!sukses ? (
            <>
              <div className="text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand text-white">
                  <ShieldQuestion className="size-6" />
                </span>
                <h1 className="mt-4 text-xl font-bold text-slate-800">Lupa Akun?</h1>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Masukkan <b>NIK</b> dan <b>No. HP</b> yang terdaftar saat pendaftaran,
                  lalu buat kata sandi baru. Akses akun Anda akan aktif kembali.
                </p>
              </div>

              {error && (
                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-600" />
                  <p className="text-xs leading-relaxed text-red-800">{error}</p>
                </div>
              )}

              <form className="mt-5 space-y-3.5" onSubmit={kirim}>
                <div>
                  <Label htmlFor="nik" className="mb-1.5 block text-sm">NIK Terdaftar *</Label>
                  <Input
                    id="nik"
                    required
                    inputMode="numeric"
                    maxLength={16}
                    value={form.nik}
                    onChange={setNik}
                    placeholder="16 digit sesuai KTP"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="noHp" className="mb-1.5 block text-sm">No. HP Terdaftar *</Label>
                  <Input
                    id="noHp"
                    required
                    inputMode="numeric"
                    maxLength={15}
                    value={form.noHp}
                    onChange={setNoHp}
                    placeholder="08xxxxxxxxxx"
                    autoComplete="off"
                  />
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    No. HP yang Anda isi saat mendaftar (boleh awalan 0 atau 62).
                  </p>
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="password" className="mb-1.5 block text-sm">Kata Sandi Baru *</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={8}
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Minimal 8 karakter"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="konfirmasi" className="mb-1.5 block text-sm">Ulangi Kata Sandi *</Label>
                    <Input
                      id="konfirmasi"
                      type="password"
                      required
                      minLength={8}
                      value={form.konfirmasi}
                      onChange={(e) => setForm((p) => ({ ...p, konfirmasi: e.target.value }))}
                      placeholder="Ulangi kata sandi"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-brand">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Ubah Kata Sandi & Pulihkan Akun
                </Button>
              </form>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-[11px] leading-relaxed text-slate-600">
                <p className="font-semibold text-slate-700">Setelah berhasil:</p>
                <p className="mt-0.5">
                  Masuk menggunakan <b>email akun</b> Anda + kata sandi baru. Bila lupa email,
                  email akun akan ditampilkan pada laporan keberhasilan di bawah.
                </p>
              </div>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                Ingat kata sandinya?{" "}
                <Link href="/login" className="font-semibold text-brand hover:underline">Masuk</Link>
              </p>
            </>
          ) : (
            <div className="text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CircleCheckBig className="size-7" />
              </span>
              <h1 className="mt-4 text-xl font-bold text-slate-800">Akun Berhasil Dipulihkan</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Kata sandi atas nama <b className="text-slate-700">{sukses.nama}</b> telah diubah.
              </p>
              {sukses.email && (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-brand/30 bg-brand-50 px-4 py-3 text-sm text-slate-700">
                  <Mail className="size-4 shrink-0 text-brand" />
                  <span>
                    Email akun: <b>{sukses.email}</b>
                  </span>
                </div>
              )}
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Semua perangkat yang tadinya masuk telah otomatis dikeluarkan.
                Silakan masuk dengan email di atas dan kata sandi baru Anda.
              </p>
              <Button onClick={() => router.push("/login")} className="mt-5 w-full bg-brand">
                <Activity className="size-4" /> Masuk Sekarang
              </Button>
            </div>
          )}

          <p className="mt-3 text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:underline">← Kembali ke halaman utama</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
