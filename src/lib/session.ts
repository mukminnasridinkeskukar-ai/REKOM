import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import type { Role } from "@/lib/types";

export const SESSION_COOKIE = "erekom_session";

export interface SessionUser {
  id: string;
  email: string;
  namaLengkap: string;
  role: Role;
  bidang: string | null;
  fotoUrl: string | null;
}

/**
 * Mengambil user yang sedang login (dari RSC maupun Route Handler).
 * - Mode Supabase: sesi auth.users + tabel profiles (RLS aktif).
 * - Mode Demo: cookie lokal + Prisma.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabase();
      if (!supabase) return null;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("nama_lengkap, role, bidang, email, foto_url")
        .eq("id", user.id)
        .single();
      if (!profile) return null;
      return {
        id: user.id,
        email: (profile.email as string) ?? user.email ?? "",
        namaLengkap: (profile.nama_lengkap as string) ?? "",
        role: profile.role as Role,
        bidang: (profile.bidang as string | null) ?? null,
        fotoUrl: ((profile as any).foto_url as string | null) ?? null,
      };
    } catch {
      return null;
    }
  }

  // Mode Demo
  const store = await cookies();
  const uid = store.get(SESSION_COOKIE)?.value;
  if (!uid) return null;
  const u = await db.user.findUnique({ where: { id: uid } });
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    namaLengkap: u.namaLengkap,
    role: u.role as Role,
    bidang: u.bidang,
    fotoUrl: u.fotoUrl,
  };
}

/** Versi untuk route handler: 401 bila belum login */
export async function requireUser(): Promise<
  { user: SessionUser } | { error: Response }
> {
  const user = await getSessionUser();
  if (!user) {
    return {
      error: Response.json({ error: "Silakan login terlebih dahulu." }, { status: 401 }),
    };
  }
  return { user };
}
