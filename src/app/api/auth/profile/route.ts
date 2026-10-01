import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/config";
import { createServerSupabase } from "@/lib/supabase/server";
import { normalisasiNik, normalisasiHp } from "@/lib/nik";

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const user = auth.user;

  const body = await req.json().catch(() => ({}));
  const nikBaru = normalisasiNik(String(body?.nik ?? ""));
  const data = {
    namaLengkap: String(body?.namaLengkap ?? "").trim(),
    nik: nikBaru || null,
    noHp: normalisasiHp(String(body?.noHp ?? "")) || null,
    asalInstansi: String(body?.asalInstansi ?? "").trim() || null,
    jabatan: String(body?.jabatan ?? "").trim() || null,
    fotoUrl: body?.fotoUrl !== undefined ? String(body?.fotoUrl ?? "") : undefined,
  };

  if (!data.namaLengkap) {
    return Response.json({ error: "Nama lengkap wajib diisi." }, { status: 400 });
  }
  if (data.nik && data.nik.length !== 16) {
    return Response.json({ error: "NIK harus 16 digit angka sesuai KTP." }, { status: 400 });
  }

  // Aturan 1 NIK = 1 akun: tolak bila NIK sudah dipakai akun lain
  if (data.nik) {
    if (isSupabaseConfigured()) {
      const supabaseCek = await createServerSupabase();
      const { data: cek } = await supabaseCek!
        .rpc("cek_nik_terdaftar", { p_nik: data.nik, p_exclude_user: user.id });
      const row = Array.isArray(cek) ? cek[0] : cek;
      if (row?.sudah_terdaftar) {
        return Response.json(
          {
            error:
              `NIK sudah terdaftar pada akun lain atas nama ${row.nama_terdaftar ?? "-"} (email ${row.email_terdaftar ?? "-"}). ` +
              `Setiap pemohon hanya boleh memiliki 1 akun.`,
            code: "NIK_TERDAFTAR",
          },
          { status: 409 }
        );
      }
    } else {
      const users = await db.user.findMany({ where: { nik: { not: null } } });
      const pemakai = users.find((u) => u.id !== user.id && (u.nik ?? "").replace(/\D/g, "") === data.nik);
      if (pemakai) {
        return Response.json(
          { error: `NIK sudah terdaftar pada akun lain (${pemakai.namaLengkap}). Setiap pemohon hanya boleh memiliki 1 akun.`, code: "NIK_TERDAFTAR" },
          { status: 409 }
        );
      }
    }
  }

  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    const payload: Record<string, unknown> = {
      nama_lengkap: data.namaLengkap,
      nik: data.nik,
      no_hp: data.noHp,
      asal_instansi: data.asalInstansi,
      jabatan: data.jabatan,
    };
    if (data.fotoUrl !== undefined) payload.foto_url = data.fotoUrl;
    const { error } = await supabase!.from("profiles").update(payload).eq("id", user.id);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true });
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      namaLengkap: data.namaLengkap,
      nik: data.nik,
      noHp: data.noHp,
      asalInstansi: data.asalInstansi,
      jabatan: data.jabatan,
      ...(data.fotoUrl !== undefined ? { fotoUrl: data.fotoUrl } : {}),
    },
  });
  return Response.json({ ok: true });
}
