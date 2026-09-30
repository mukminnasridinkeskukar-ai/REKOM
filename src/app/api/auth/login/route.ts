import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createHash } from "crypto";
import { isSupabaseConfigured } from "@/lib/config";
import { createServerSupabase } from "@/lib/supabase/server";
import { ensureSeeded, DEMO_PASSWORD } from "@/lib/demo/seed";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password) {
    return Response.json({ error: "Email dan kata sandi wajib diisi." }, { status: 400 });
  }

  // ==== Mode Supabase ====
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    if (!supabase) return Response.json({ error: "Supabase belum siap." }, { status: 500 });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return Response.json({ error: error.message }, { status: 401 });
    return Response.json({ ok: true, mode: "supabase", user: data.user?.id });
  }

  // ==== Mode Demo ====
  await ensureSeeded();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.passwordHash !== createHash("sha256").update(password).digest("hex")) {
    return Response.json({ error: "Email atau kata sandi salah." }, { status: 401 });
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  void DEMO_PASSWORD;
  return Response.json({ ok: true, mode: "demo", user: { id: user.id, namaLengkap: user.namaLengkap, role: user.role } });
}
