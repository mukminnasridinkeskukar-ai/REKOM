"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Loader2, LogIn, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured } from "@/lib/config";

const AKUN_DEMO = [
  { email: "pemohon@dinkes.go.id", label: "Pemohon", nama: "Andi Saputra, S.Kep" },
  { email: "verifikator.sdmk@dinkes.go.id", label: "Verifikator SDMK", nama: "dr. Rina Kartika" },
  { email: "admin.tu@dinkes.go.id", label: "Admin TU", nama: "Muhammad Fadli" },
  { email: "kabid@dinkes.go.id", label: "Kabid", nama: "dr. Hendra Gunawan" },
  { email: "kadis@dinkes.go.id", label: "Kepala Dinas", nama: "dr. H. Abdul Rahman" },
  { email: "superadmin@dinkes.go.id", label: "Super Admin", nama: "Rahmat Hidayat" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.user) router.replace("/dashboard");
      })
      .catch(() => undefined);
  }, [router]);

  const masuk = async (em?: string, pw?: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em ?? email, password: pw ?? password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal masuk");
      toast.success("Berhasil masuk. Selamat bekerja!");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand-950 via-brand to-teal-brand">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">
          {/* panel kiri */}
          <div className="hidden flex-col justify-between bg-gradient-to-br from-brand to-teal-brand p-8 text-white lg:flex">
            <div>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15">
                <Activity className="size-7" />
              </span>
              <h1 className="mt-5 text-2xl font-extrabold leading-tight">E-REKOM</h1>
              <p className="mt-1 text-sm text-white/80">
                Tata Kelola Rekomendasi Kepala Dinas Kesehatan Kabupaten Kutai Kartanegara
              </p>
            </div>
            <ul className="space-y-3 text-sm text-white/90">
              <li className="flex items-center gap-2.5">
                <Zap className="size-4 text-gold" /> Formulir dinamis & verifikasi berkas lintas bidang
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="size-4 text-gold" /> Surat resmi dengan QR Code verifikasi keaslian
              </li>
              <li className="flex items-center gap-2.5">
                <LogIn className="size-4 text-gold" /> Notifikasi realtime ke seluruh pihak
              </li>
            </ul>
            <p className="text-[11px] text-white/60">Jalan Gajah Mada No. 9 Tenggarong 75512</p>
          </div>

          {/* panel kanan */}
          <div className="p-8 sm:p-10">
            <h2 className="text-xl font-bold text-slate-800">Masuk ke Akun</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gunakan email dan kata sandi yang terdaftar.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                masuk();
              }}
            >
              <div>
                <Label htmlFor="email" className="mb-1.5 block text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@dinkes.go.id"
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="password" className="mb-1.5 block text-sm">Kata Sandi</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full bg-brand">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />} Masuk
              </Button>
            </form>

            {!isSupabaseConfigured() && (
              <div className="mt-6 rounded-xl border border-gold/40 bg-gold-light/50 p-3.5">
                <p className="text-xs font-semibold text-amber-800">
                  Mode Demo — pilih akun cepat (kata sandi: demo1234)
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {AKUN_DEMO.map((a) => (
                    <button
                      key={a.email}
                      disabled={busy}
                      onClick={() => masuk(a.email, "demo1234")}
                      className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-medium text-amber-800 transition-colors hover:bg-amber-100"
                      title={a.nama}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Belum punya akun?{" "}
              <Link href="/daftar" className="font-semibold text-brand hover:underline">
                Daftar sekarang
              </Link>
            </p>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              <Link href="/" className="hover:underline">← Kembali ke halaman utama</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
