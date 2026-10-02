import { requireUser } from "@/lib/session";
import { getStore } from "@/lib/store";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    const store = await getStore();
    const result = await store.applyAction(auth.user, id, {
      action: String(body?.action ?? ""),
      catatan: body?.catatan ? String(body.catatan) : undefined,
      fileTerbit: body?.fileTerbit ? String(body.fileTerbit) : undefined,
    });
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    const data = await store.getPengajuan(auth.user, id);
    return Response.json({ ok: true, data });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
