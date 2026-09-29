import { requireUser } from "@/lib/session";
import { getStore } from "@/lib/store";
async function guardSuperAdmin(): Promise<Response | null> {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== "super_admin") {
    return Response.json({ error: "Hanya Super Admin." }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await guardSuperAdmin();
  if (denied) return denied;
  try {
    const store = await getStore();
    const data = await store.listUsers();
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const denied = await guardSuperAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.role) {
    return Response.json({ error: "id dan role wajib diisi." }, { status: 400 });
  }
  const allowedRoles = ["pemohon", "verifikator_bidang", "admin_tu", "kabid", "kadis", "super_admin"];
  if (!allowedRoles.includes(String(body.role))) {
    return Response.json({ error: "Role tidak valid." }, { status: 400 });
  }
  try {
    const store = await getStore();
    await store.updateUserRole(String(body.id), String(body.role), body.bidang ? String(body.bidang) : null);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
