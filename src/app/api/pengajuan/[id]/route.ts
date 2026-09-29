import { requireUser } from "@/lib/session";
import { getStore } from "@/lib/store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  try {
    const store = await getStore();
    const data = await store.getPengajuan(auth.user, id);
    if (!data) return Response.json({ error: "Pengajuan tidak ditemukan / tidak berwenang." }, { status: 404 });
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** Pemohon memperbaiki form (status perlu_perbaikan) lalu ajukan ulang */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const judul = String(body?.judulPengajuan ?? "").trim();
  const dataFormJson =
    typeof body?.dataFormJson === "string" ? body.dataFormJson : JSON.stringify(body?.dataFormJson ?? {});
  if (!judul) return Response.json({ error: "Judul pengajuan wajib diisi." }, { status: 400 });

  try {
    const store = await getStore();
    const p = await store.getPengajuan(auth.user, id);
    if (!p) return Response.json({ error: "Pengajuan tidak ditemukan / tidak berwenang." }, { status: 404 });
    if (p.pemohon?.id !== auth.user.id) {
      return Response.json({ error: "Hanya pemohon yang dapat memperbaiki." }, { status: 403 });
    }
    await store.updateForm(auth.user, id, judul, dataFormJson);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
