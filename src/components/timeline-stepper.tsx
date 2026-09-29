"use client";

import { Check, X, AlertCircle } from "lucide-react";
import { STATUS_META, STATUS_ORDER, type Status } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TrackingItem {
  id: string;
  keStatus: string;
  catatan: string | null;
  olehNama: string | null;
  createdAt: string;
}

function waktuRelatif(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const menit = Math.floor(diff / 60000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 30) return `${hari} hari lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function TimelineStepper({
  status,
  tracking,
}: {
  status: Status;
  tracking: TrackingItem[];
}) {
  const bermasalah = status === "perlu_perbaikan" || status === "ditolak";
  const idxSekarang = STATUS_ORDER.indexOf(status);

  return (
    <div className="space-y-0">
      {STATUS_ORDER.map((s, i) => {
        const meta = STATUS_META[s];
        const event = tracking.find((t) => t.keStatus === s);
        const selesai = Boolean(event) || (idxSekarang >= i && !bermasalah);
        const aktif = status === s;
        const isLast = i === STATUS_ORDER.length - 1;

        let warnaTitik = "bg-slate-200 text-slate-400";
        if (aktif) warnaTitik = "text-white";
        else if (selesai || event) warnaTitik = "bg-emerald-500 text-white";
        if (aktif && status !== "ditolak") warnaTitik = "bg-brand text-white";

        return (
          <div key={s} className="relative flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                  warnaTitik,
                  aktif ? "border-brand animate-pulse" : selesai || event ? "border-emerald-500" : "border-slate-200"
                )}
                style={aktif && status !== "ditolak" ? { backgroundColor: meta.color, borderColor: meta.color } : undefined}
              >
                {aktif && status === "ditolak" ? (
                  <X className="size-3.5" />
                ) : aktif && status === "perlu_perbaikan" ? (
                  <AlertCircle className="size-3.5" />
                ) : selesai || event ? (
                  <Check className="size-3.5" />
                ) : (
                  i + 1
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-8",
                    selesai || event ? "bg-emerald-400" : "bg-slate-200"
                  )}
                />
              )}
            </div>
            <div className={cn("pb-4", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium leading-6",
                  aktif ? "text-foreground" : selesai || event ? "text-foreground/80" : "text-muted-foreground/60"
                )}
              >
                {meta.label}
              </p>
              {event ? (
                <div className="mt-0.5 space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    {event.olehNama ?? "Sistem"} · {waktuRelatif(event.createdAt)}
                  </p>
                  {event.catatan && (
                    <p className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {event.catatan}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/50">{meta.deskripsi}</p>
              )}
            </div>
          </div>
        );
      })}

      {bermasalah && (
        <div className="relative flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-white",
                status === "ditolak" ? "bg-red-500 border-red-500" : "bg-orange-500 border-orange-500"
              )}
            >
              {status === "ditolak" ? <X className="size-3.5" /> : <AlertCircle className="size-3.5" />}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">{STATUS_META[status].label}</p>
            {tracking
              .filter((t) => t.keStatus === status)
              .map((t) => (
                <div key={t.id} className="mt-0.5 space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    {t.olehNama ?? "Sistem"} · {waktuRelatif(t.createdAt)}
                  </p>
                  {t.catatan && (
                    <p
                      className={cn(
                        "rounded-md px-2 py-1 text-xs",
                        status === "ditolak"
                          ? "bg-red-50 text-red-700"
                          : "bg-orange-50 text-orange-700"
                      )}
                    >
                      {t.catatan}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
