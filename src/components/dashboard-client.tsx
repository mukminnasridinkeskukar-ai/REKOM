"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, SlidersHorizontal, Loader2, Inbox } from "lucide-react";
import { CardRekom } from "@/components/card-rekom";
import { LightboxRekom } from "@/components/lightbox-rekom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";
import type { AksiTersedia, JenisRekomDTO, MeDTO, PengajuanDTO, Status } from "@/lib/types";
import { STATUS_META } from "@/lib/types";
import { toast } from "sonner";

export function DashboardClient({ user }: { user: MeDTO }) {
  const searchParams = useSearchParams();
  const [semua, setSemua] = useState<PengajuanDTO[]>([]);
  const [jenisList, setJenisList] = useState<JenisRekomDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [q, setQ] = useState("");
  const [jenisId, setJenisId] = useState<string>("semua");
  const [status, setStatus] = useState<string>("semua");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [idBuka, setIdBuka] = useState<string | null>(null);

  const muatUlang = useCallback(async () => {
    try {
      const res = await fetch("/api/pengajuan", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setSemua(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muatUlang();
    fetch("/api/jenis")
      .then((r) => r.json())
      .then((j) => setJenisList(j.data ?? []))
      .catch(() => undefined);
  }, [muatUlang]);

  // Realtime (Supabase) / polling (demo) untuk daftar pengajuan
  useEffect(() => {
    let channel: { unsubscribe: () => void } | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      if (supabase) {
        const ch = supabase
          .channel("pengajuan-dashboard")
          .on("postgres_changes", { event: "*", schema: "public", table: "pengajuan_rekom" }, () => muatUlang())
          .subscribe();
        channel = ch as unknown as { unsubscribe: () => void };
      }
    } else {
      timer = setInterval(muatUlang, 15000);
    }
    return () => {
      channel?.unsubscribe();
      if (timer) clearInterval(timer);
    };
  }, [muatUlang]);

  // buka lightbox dari notifikasi ?buka={id}
  useEffect(() => {
    const bukaId = searchParams.get("buka");
    if (bukaId && semua.length > 0 && idBuka === null) {
      if (semua.some((p) => p.id === bukaId)) setIdBuka(bukaId);
    }
  }, [searchParams, semua]);

  const hasilFilter = useMemo(() => {
    return semua.filter((p) => {
      if (q) {
        const needle = q.toLowerCase();
        const hay = [p.kode, p.judulPengajuan, p.nomorSurat, p.pemohon?.namaLengkap, p.jenis?.namaJenis]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (jenisId !== "semua" && p.jenis?.id !== jenisId) return false;
      if (status !== "semua" && p.status !== status) return false;
      if (from && new Date(p.createdAt) < new Date(from)) return false;
      if (to && new Date(p.createdAt) > new Date(`${to}T23:59:59.999`)) return false;
      return true;
    });
  }, [semua, q, jenisId, status, from, to]);

  const lakukanAksi = async (id: string, aksi: AksiTersedia, catatan?: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/pengajuan/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: aksi, catatan }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memproses aksi");
      toast.success(`Aksi "${aksi.replace(/_/g, " ")}" berhasil diproses.`);
      await muatUlang();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const indexAktif = idBuka ? hasilFilter.findIndex((p) => p.id === idBuka) : -1;
  const adaFilter = q || jenisId !== "semua" || status !== "semua" || from || to;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Dashboard Pengajuan</h1>
          <p className="text-sm text-muted-foreground">
            Selamat datang, {user.namaLengkap} — kelola semua rekomendasi di satu tempat.
          </p>
        </div>
        <Button asChild className="bg-teal-brand hover:bg-teal-brand/90">
          <a href="/pengajuan/baru">+ Pengajuan Baru</a>
        </Button>
      </div>

      {/* ===== Filter & search ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari judul, kode, nomor surat, atau pemohon..."
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Select value={jenisId} onValueChange={setJenisId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Jenis</SelectItem>
                {jenisList.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.namaJenis}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Status</SelectItem>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dari tanggal" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Sampai tanggal" />
          </div>
          {adaFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setJenisId("semua");
                setStatus("semua");
                setFrom("");
                setTo("");
              }}
              className="shrink-0 text-slate-500"
            >
              <SlidersHorizontal className="size-4" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* ===== Grid kartu ===== */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" /> Memuat pengajuan...
        </div>
      ) : hasilFilter.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Inbox className="mx-auto size-10 text-slate-300" />
          <p className="mt-3 font-medium text-slate-500">
            {adaFilter ? "Tidak ada pengajuan yang cocok dengan filter." : "Belum ada pengajuan."}
          </p>
          {!adaFilter && (
            <Button asChild className="mt-4 bg-brand">
              <a href="/pengajuan/baru">Buat Pengajuan Pertama</a>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {hasilFilter.map((p, i) => (
              <CardRekom
                key={p.id}
                pengajuan={p}
                index={i}
                aktif={idBuka === p.id}
                onClick={() => setIdBuka(p.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ===== Lightbox — selalu ter-mount agar animasi exit berjalan ===== */}
      <LightboxRekom
        daftar={hasilFilter}
        index={indexAktif}
        user={user}
        busy={busy}
        visible={indexAktif >= 0}
        onClose={() => setIdBuka(null)}
        onNavigate={(i) => setIdBuka(hasilFilter[i]?.id ?? null)}
        onAksi={lakukanAksi}
      />
    </div>
  );
}
