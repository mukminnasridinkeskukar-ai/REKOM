"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Activity, CircleAlert, Loader2, UserRoundPlus } from "lucide-react";
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
  const [nikCek, setNikCek] = useState<{
    status: "idle" | "cek" | "bebas" | "terdaftar";
    nama?: string | null;
    email?: string | null;
  }>({ status: "idle" });
  const timerNik = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const setNik = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
    setForm((p) => ({ ...p, nik: digits }));
  };

  const setNoHp = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 15);
    setForm((p) => ({ ...p, noHp: digits }));
  };

  // Cek otomatis saat NIK lengkap 16 digit — notifikasi dini bila sudah terdaftar
  useEffect(() => {
    if (timerNik.current) clearTimeout(timerNik.current);
    if (form.nik.length !== 16) {
      setNikCek({ status: "idle" });
      return;
    }
    setNikCek({ status: "cek" });
    timerNik.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/cek-nik?nik=${form.nik}`);
        const json = await res.json();
        if (json.terdaftar) {
          setNikCek({ status: "terdaftar", nama: json.namaLengkap, email: json.emailMasked });
        } else {
          setNikCek({ status: "bebas" });
        }
      } catch {
        setNikCek({ status: "idle" });
      }
    }, 400);
    return () => {
      if (timerNik.current) clearTimeout(timerNik.current);
    };
  }, [form.nik]);

  const daftar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.nik.length !== 16) {
      toast.error("NIK wajib diisi 16 digit angka sesuai KTP.");
      return;
    }
    if (nikCek.status === "terdaftar") {
      toast.error("NIK sudah terdaftar — setiap pemohon hanya boleh memiliki 1 akun.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.code === "NIK_TERDAFTAR") {
          setNikCek({ status: "terdaftar" });
        }
        throw new Error(json.error ?? "Pendaftaran gagal");
      }
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

  const nikTerblokir = nikCek.status === "terdaftar";

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
                <Label htmlFor="nik" className="mb-1.5 block text-sm">NIK *</Label>
                <Input
                  id="nik"
                  required
                  inputMode="numeric"
                  maxLength={16}
                  value={form.nik}
                  onChange={setNik}
                  placeholder="16 digit sesuai KTP"
                  className={nikTerblokir ? "border-red-400 focus-visible:ring-red-300" : undefined}
                  aria-invalid={nikTerblokir}
                />
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  Identitas unik pemohon — 1 NIK hanya untuk 1 akun.
                </p>
              </div>
              <div>
                <Label htmlFor="noHp" className="mb-1.5 block text-sm">No. HP *</Label>
                <Input
                  id="noHp"
                  required
                  inputMode="numeric"
                  maxLength={15}
                  value={form.noHp}
                  onChange={setNoHp}
                  placeholder="08xxxxxxxxxx"
                />
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  Dipakai untuk memulihkan akun bila lupa kata sandi.
                </p>
              </div>
            </div>

            {nikCek.status === "terdaftar" && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-600" />
                <div className="text-xs leading-relaxed text-red-800">
                  <p className="font-semibold">NIK sudah terdaftar{nikCek.nama ? ` atas nama ${nikCek.nama}` : ""}{nikCek.email ? ` (email ${nikCek.email})` : ""}.</p>
                  <p className="mt-0.5">
                    Setiap pemohon hanya boleh memiliki 1 akun.{" "}
                    <Link href="/login" className="font-semibold underline">Masuk ke akun Anda</Link>
                    {" "}atau{" "}
                    <Link href="/lupa-akun" className="font-semibold underline">lupa akun?</Link>{" "}
                    bila tidak dapat akses.
                  </p>
                </div>
              </div>
            )}
            {nikCek.status === "bebas" && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-700">
                NIK tersedia — dapat dipakai mendaftar.
              </p>
            )}

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
            <Button type="submit" disabled={busy || nikTerblokir} className="w-full bg-brand">
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
