import { requireUser } from "@/lib/session";
import { getStore } from "@/lib/store";
import type { JenisInput } from "@/lib/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("activeOnly") !== "false";
  try {
    const store = await getStore();
    const data = await store.listJenis(activeOnly);
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== "super_admin") {
    return Response.json({ error: "Hanya Super Admin yang dapat menambah jenis rekomendasi." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.kodeJenis || !body?.namaJenis) {
    return Response.json({ error: "Kode dan nama jenis wajib diisi." }, { status: 400 });
  }
  try {
    const store = await getStore();
    const input: JenisInput = {
      kodeJenis: String(body.kodeJenis).trim().toUpperCase(),
      namaJenis: String(body.namaJenis).trim(),
      deskripsi: String(body.deskripsi ?? "").trim() || null,
      icon: String(body.icon ?? "FileText"),
      warna: String(body.warna ?? "#0F766E"),
      bidang: String(body.bidang ?? "Sekretariat"),
      persyaratanJson: typeof body.persyaratanJson === "string" ? body.persyaratanJson : JSON.stringify(body.persyaratanJson ?? {}),
      templateNomor: String(body.templateNomor ?? "440/{seq}/{kode}/Dinkes-Kukar/{year}"),
      isActive: body.isActive !== false,
      urutan: Number(body.urutan ?? 99),
    };
    const data = await store.createJenis(input);
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
