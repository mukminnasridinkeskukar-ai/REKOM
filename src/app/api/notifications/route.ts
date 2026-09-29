import { requireUser } from "@/lib/session";
import { getStore } from "@/lib/store";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  try {
    const store = await getStore();
    const data = await store.listNotifications(auth.user);
    return Response.json({ data, unread: data.filter((n) => !n.isRead).length });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => ({}));
  try {
    const store = await getStore();
    await store.markNotificationsRead(auth.user, body?.ids ?? undefined);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
