import { requireUser } from "@/lib/session";
import { getStore } from "@/lib/store";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  try {
    const store = await getStore();
    await store.removeDokumen(auth.user, id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
