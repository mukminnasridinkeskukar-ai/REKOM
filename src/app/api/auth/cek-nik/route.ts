import { db } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/config";
import { createServerSupabase } from "@/lib/supabase/server";
import { ensureSeeded } from "@/lib/demo/seed";
import { normalisasiNik, maskEmail, maskNama } from "@/lib/nik";

/**
 * GET /api/auth/cek-nik?nik=16digit
 * Dipakai form pendaftaran: notifikasi langsung bila NIK sudah terdaftar.
 * Nama & email yang dikembalikan sudah disamarkan (privasi).
 */
export async function GET(req: Request) {
  const nik = normalisasiNik(new URL(req.url).searchParams.get("nik") ?? "");
  if (nik.length !== 16) {
    return Response.json({ terdaftar: false, invalid: nik.length > 0 });
  }

  // ==== Mode Supabase ====
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    if (!supabase) return Response.json({ error: "Supabase belum siap." }, { status: 500 });
    const { data, error } = await supabase.rpc("cek_nik_terdaftar", { p_nik: nik });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    const row = Array.isArray(data) ? data[0] : data;
    return Response.json({
      terdaftar: Boolean(row?.sudah_terdaftar),
      namaLengkap: row?.sudah_terdaftar ? maskNama(row?.nama_terdaftar) : null,
      emailMasked: row?.sudah_terdaftar ? maskEmail(row?.email_terdaftar) : null,
    });
  }

  // ==== Mode Demo ====
  await ensureSeeded();
  const users = await db.user.findMany({
    where: { nik: { not: null } },
    select: { nik: true, namaLengkap: true, email: true },
  });
  const ketemu = users.find((u) => (u.nik ?? "").replace(/\D/g, "") === nik);
  return Response.json({
    terdaftar: Boolean(ketemu),
    namaLengkap: ketemu ? maskNama(ketemu.namaLengkap) : null,
    emailMasked: ketemu ? maskEmail(ketemu.email) : null,
  });
}
