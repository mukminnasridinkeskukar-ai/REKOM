import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import type { MeDTO } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

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
    fotoUrl: user.fotoUrl,
  };

  return <AppShell user={me}>{children}</AppShell>;
}
