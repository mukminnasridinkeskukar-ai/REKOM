import { requireUser } from "@/lib/session";
import { getStore } from "@/lib/store";
import type { DokumenMeta } from "@/lib/store";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body?.namaDokumen || !body?.fileUrl) {
    return Response.json({ error: "namaDokumen dan fileUrl wajib." }, { status: 400 });
  }
  try {
    const store = await getStore();
    const meta: DokumenMeta = {
      namaDokumen: String(body.namaDokumen),
      fileUrl: String(body.fileUrl),
      tipeFile: String(body.tipeFile ?? "application/octet-stream"),
      ukuran: Number(body.ukuran ?? 0),
    };
    await store.addDokumen(auth.user, id, meta);
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
