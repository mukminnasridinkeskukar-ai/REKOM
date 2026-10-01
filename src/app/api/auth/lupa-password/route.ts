import { db } from "@/lib/db";
import { createHash } from "crypto";
import { isSupabaseConfigured } from "@/lib/config";
import { createServerSupabase } from "@/lib/supabase/server";
import { ensureSeeded } from "@/lib/demo/seed";
import { normalisasiNik, normalisasiHp, hpCocok } from "@/lib/nik";

/**
 * POST /api/auth/lupa-password
 * Pemulihan akses mandiri: verifikasi NIK + No. HP terdaftar,
 * lalu kata sandi diganti langsung oleh pemohon.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const nik = normalisasiNik(String(body?.nik ?? ""));
  const noHp = normalisasiHp(String(body?.noHp ?? ""));
  const password = String(body?.password ?? "");
  const konfirmasi = String(body?.konfirmasi ?? "");

  if (nik.length !== 16) {
    return Response.json({ error: "NIK harus 16 digit angka." }, { status: 400 });
  }
  if (noHp.length < 9) {
    return Response.json({ error: "Masukkan No. HP yang terdaftar (contoh: 0812xxxxxxxx)." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Kata sandi baru minimal 8 karakter." }, { status: 400 });
  }
  if (konfirmasi && konfirmasi !== password) {
    return Response.json({ error: "Konfirmasi kata sandi tidak sama." }, { status: 400 });
  }

  // ==== Mode Supabase ====
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    if (!supabase) return Response.json({ error: "Supabase belum siap." }, { status: 500 });
    const { data, error } = await supabase.rpc("lupa_password_reset", {
      p_nik: nik,
      p_no_hp: noHp,
      p_password: password,
    });
    if (error) return Response.json({ error: error.message }, { status: 400 });
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.ok) {
      const pesan = String(row?.pesan ?? "Gagal mengatur ulang kata sandi.");
      const status = pesan.includes("Terlalu banyak") ? 429 : 400;
      return Response.json({ error: pesan }, { status });
    }
    return Response.json({
      ok: true,
      namaLengkap: row.nama_lengkap ?? null,
      email: row.email ?? null,
      pesan: row.pesan ?? null,
    });
  }

  // ==== Mode Demo ====
  await ensureSeeded();
  const users = await db.user.findMany({ where: { nik: { not: null } } });
  const user = users.find((u) => (u.nik ?? "").replace(/\D/g, "") === nik);
  if (!user) {
    return Response.json(
      { error: "NIK tidak ditemukan. Pastikan NIK sesuai yang terdaftar, atau daftar akun baru." },
      { status: 404 }
    );
  }
  if (!hpCocok(user.noHp, noHp)) {
    return Response.json(
      { error: "No. HP tidak cocok dengan akun NIK ini. Gunakan No. HP yang terdaftar saat mendaftar." },
      { status: 400 }
    );
  }
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: createHash("sha256").update(password).digest("hex") },
  });
  return Response.json({ ok: true, namaLengkap: user.namaLengkap, email: user.email });
}
