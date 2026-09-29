import { Suspense } from "react";
import { getSessionUser } from "@/lib/session";
import { DashboardClient } from "@/components/dashboard-client";
import { Loader2 } from "lucide-react";
import type { MeDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const me: MeDTO = {
    id: user.id,
    email: user.email,
    namaLengkap: user.namaLengkap,
    nik: null,
    noHp: null,
    asalInstansi: null,
    jabatan: null,
    role: user.role,
    bidang: user.bidang,
    fotoUrl: null,
  };
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" /> Memuat...
        </div>
      }
    >
      <DashboardClient user={me} />
    </Suspense>
  );
}
