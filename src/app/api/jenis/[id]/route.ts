import { requireUser } from "@/lib/session";
import { getStore } from "@/lib/store";
import type { JenisInput } from "@/lib/store";

async function guard() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== "super_admin") {
    return Response.json({ error: "Hanya Super Admin yang dapat mengelola jenis rekomendasi." }, { status: 403 });
  }
  return null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    const store = await getStore();
    const input: Partial<JenisInput> = {};
    if (body.kodeJenis !== undefined) input.kodeJenis = String(body.kodeJenis).trim().toUpperCase();
    if (body.namaJenis !== undefined) input.namaJenis = String(body.namaJenis).trim();
    if (body.deskripsi !== undefined) input.deskripsi = String(body.deskripsi).trim() || null;
    if (body.icon !== undefined) input.icon = String(body.icon);
    if (body.warna !== undefined) input.warna = String(body.warna);
    if (body.bidang !== undefined) input.bidang = String(body.bidang);
    if (body.persyaratanJson !== undefined)
      input.persyaratanJson =
        typeof body.persyaratanJson === "string" ? body.persyaratanJson : JSON.stringify(body.persyaratanJson);
    if (body.templateNomor !== undefined) input.templateNomor = String(body.templateNomor);
    if (body.isActive !== undefined) input.isActive = Boolean(body.isActive);
    if (body.urutan !== undefined) input.urutan = Number(body.urutan);
    await store.updateJenis(id, input);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await ctx.params;
  try {
    const store = await getStore();
    await store.deleteJenis(id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
