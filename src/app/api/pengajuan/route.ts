import { requireUser } from "@/lib/session";
import { getStore } from "@/lib/store";
import type { CreatePengajuanInput } from "@/lib/store";

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { searchParams } = new URL(req.url);
  try {
    const store = await getStore();
    const data = await store.listPengajuan(auth.user, {
      q: searchParams.get("q") ?? undefined,
      jenisId: searchParams.get("jenisId") ?? undefined,
      status: (searchParams.get("status") as never) ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => null);
  if (!body?.jenisId || !body?.judulPengajuan) {
    return Response.json({ error: "Jenis rekomendasi dan judul pengajuan wajib diisi." }, { status: 400 });
  }
  try {
    const store = await getStore();
    const input: CreatePengajuanInput = {
      jenisId: String(body.jenisId),
      judulPengajuan: String(body.judulPengajuan).trim(),
      dataFormJson: typeof body.dataFormJson === "string" ? body.dataFormJson : JSON.stringify(body.dataFormJson ?? {}),
    };
    const id = await store.createPengajuan(auth.user, input);
    return Response.json({ data: { id } }, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
