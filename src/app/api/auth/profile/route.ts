import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/config";
import { createServerSupabase } from "@/lib/supabase/server";

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const user = auth.user;

  const body = await req.json().catch(() => ({}));
  const data = {
    namaLengkap: String(body?.namaLengkap ?? "").trim(),
    nik: String(body?.nik ?? "").trim() || null,
    noHp: String(body?.noHp ?? "").trim() || null,
    asalInstansi: String(body?.asalInstansi ?? "").trim() || null,
    jabatan: String(body?.jabatan ?? "").trim() || null,
    fotoUrl: body?.fotoUrl !== undefined ? String(body?.fotoUrl ?? "") : undefined,
  };

  if (!data.namaLengkap) {
    return Response.json({ error: "Nama lengkap wajib diisi." }, { status: 400 });
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
