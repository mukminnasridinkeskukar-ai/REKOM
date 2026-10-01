import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createHash } from "crypto";
import { isSupabaseConfigured } from "@/lib/config";
import { createServerSupabase } from "@/lib/supabase/server";
import { ensureSeeded, DEMO_PASSWORD } from "@/lib/demo/seed";
import { SESSION_COOKIE } from "@/lib/session";
import { normalisasiNik, normalisasiHp } from "@/lib/nik";

/** Pesan seragam bila NIK sudah dipakai akun lain (1 NIK = 1 akun). */
function pesanNikTerdaftar(nama: string | null, email: string | null) {
  return (
    `NIK sudah terdaftar atas nama ${nama ?? "-"} (email ${email ?? "-"}). ` +
    `Setiap pemohon hanya boleh memiliki 1 akun. Silakan masuk dengan akun Anda, ` +
    `atau klik "Lupa Akun" di halaman masuk bila tidak dapat akses.`
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const namaLengkap = String(body?.namaLengkap ?? "").trim();
  const nik = normalisasiNik(String(body?.nik ?? ""));
  const noHp = normalisasiHp(String(body?.noHp ?? ""));
  const asalInstansi = String(body?.asalInstansi ?? "").trim();
  const jabatan = String(body?.jabatan ?? "").trim();

  if (!email || !password || !namaLengkap) {
    return Response.json({ error: "Nama lengkap, email, dan kata sandi wajib diisi." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Kata sandi minimal 8 karakter." }, { status: 400 });
  }
  if (nik.length !== 16) {
    return Response.json(
      { error: "NIK wajib diisi 16 digit angka sesuai KTP (tanpa spasi/huruf).", code: "NIK_TIDAK_VALID" },
      { status: 400 }
    );
  }

  // ==== Mode Supabase ====
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    if (!supabase) return Response.json({ error: "Supabase belum siap." }, { status: 500 });

    // Aturan 1 NIK = 1 akun: tolak bila NIK sudah terdaftar (cek dulu, sebelum signup)
    const { data: cek, error: cekErr } = await supabase.rpc("cek_nik_terdaftar", { p_nik: nik });
    if (!cekErr) {
      const row = Array.isArray(cek) ? cek[0] : cek;
      if (row?.sudah_terdaftar) {
        return Response.json(
          { error: pesanNikTerdaftar(row.nama_terdaftar, row.email_terdaftar), code: "NIK_TERDAFTAR" },
          { status: 409 }
        );
      }
    }

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
    if (error) {
      const msg = /already registered|already exists/i.test(error.message)
        ? "Email sudah terdaftar. Silakan masuk, atau klik \"Lupa Akun\" bila tidak dapat akses."
        : error.message;
      return Response.json({ error: msg }, { status: 409 });
    }
    // Supabase menandai email ganda dengan daftar identitas kosong
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return Response.json(
        { error: "Email sudah terdaftar. Silakan masuk, atau klik \"Lupa Akun\" bila tidak dapat akses.", code: "EMAIL_TERDAFTAR" },
        { status: 409 }
      );
    }
    return Response.json({ ok: true, mode: "supabase", needsConfirm: !data.session });
  }

  // ==== Mode Demo ====
  await ensureSeeded();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "Email sudah terdaftar. Silakan login." }, { status: 409 });
  }
  // Aturan 1 NIK = 1 akun (Mode Demo)
  const pemakaiNik = (await db.user.findMany({ where: { nik: { not: null } } })).find(
    (u) => (u.nik ?? "").replace(/\D/g, "") === nik
  );
  if (pemakaiNik) {
    return Response.json({ error: pesanNikTerdaftar(pemakaiNik.namaLengkap, pemakaiNik.email), code: "NIK_TERDAFTAR" }, { status: 409 });
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
