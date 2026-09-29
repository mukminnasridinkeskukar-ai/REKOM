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
  const namaLengkap = String(body?.namaLengkap ?? "").trim();
  const nik = String(body?.nik ?? "").trim();
  const noHp = String(body?.noHp ?? "").trim();
  const asalInstansi = String(body?.asalInstansi ?? "").trim();
  const jabatan = String(body?.jabatan ?? "").trim();

  if (!email || !password || !namaLengkap) {
    return Response.json({ error: "Nama lengkap, email, dan kata sandi wajib diisi." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Kata sandi minimal 8 karakter." }, { status: 400 });
  }

  // ==== Mode Supabase ====
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    if (!supabase) return Response.json({ error: "Supabase belum siap." }, { status: 500 });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nama_lengkap: namaLengkap,
          nik: nik || null,
          no_hp: noHp || null,
          asal_instansi: asalInstansi || null,
          jabatan: jabatan || null,
          role: "pemohon",
        },
      },
    });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true, mode: "supabase", needsConfirm: !data.session });
  }

  // ==== Mode Demo ====
  await ensureSeeded();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "Email sudah terdaftar. Silakan login." }, { status: 409 });
  }
  const user = await db.user.create({
    data: {
      email,
      passwordHash: createHash("sha256").update(password).digest("hex"),
      namaLengkap,
      nik: nik || null,
      noHp: noHp || null,
      asalInstansi: asalInstansi || "Instansi di Luar Dinkes",
      jabatan: jabatan || "Pemohon",
      role: "pemohon",
    },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  void DEMO_PASSWORD;
  return Response.json({ ok: true, mode: "demo" });
}
