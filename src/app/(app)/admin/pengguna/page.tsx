"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABEL, BIDANG_LIST } from "@/lib/types";
import type { AdminUserDTO } from "@/lib/store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ROLES = Object.entries(ROLE_LABEL);

export default function AdminPenggunaPage() {
  const [list, setList] = useState<AdminUserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [simpanId, setSimpanId] = useState<string | null>(null);

  const muat = async () => {
    const res = await fetch("/api/users");
    if (!res.ok) return setLoading(false);
    const j = await res.json();
    setList(j.data ?? []);
    setLoading(false);
  };
  useEffect(() => {
    muat();
  }, []);

  const ubah = async (u: AdminUserDTO, role: string, bidang: string | null) => {
    setSimpanId(u.id);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, role, bidang }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal memperbarui");
      setList((prev) => prev.map((x) => (x.id === u.id ? { ...x, role, bidang } : x)));
      toast.success(`Role ${u.namaLengkap} diperbarui.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSimpanId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Memuat...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Kelola Pengguna & Role</h1>
        <p className="text-sm text-muted-foreground">
          Atur hak akses setiap pengguna. Verifikator bidang memerlukan penentuan bidang (SDMK / Yankes / Farmalkes).
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Pengguna</th>
              <th className="px-4 py-3">Instansi</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Bidang</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 ring-1 ring-slate-200">
                      {u.fotoUrl && <AvatarImage src={u.fotoUrl} alt={u.namaLengkap} />}
                      <AvatarFallback className="bg-brand-50 text-xs font-bold text-brand">
                        {u.namaLengkap.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{u.namaLengkap}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    {simpanId === u.id && <Loader2 className="size-4 animate-spin text-brand" />}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {u.asalInstansi ?? "-"}
                  <span className="block text-xs text-muted-foreground">{u.jabatan ?? ""}</span>
                </td>
                <td className="px-4 py-3">
                  <Select value={u.role} onValueChange={(v) => ubah(u, v, u.bidang)}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(([k, label]) => (
                        <SelectItem key={k} value={k}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Select value={u.bidang ?? "none"} onValueChange={(v) => ubah(u, u.role, v === "none" ? null : v)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {BIDANG_LIST.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
