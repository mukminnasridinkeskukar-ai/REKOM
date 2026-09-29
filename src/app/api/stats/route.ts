import { getStore } from "@/lib/store";

export async function GET() {
  try {
    const store = await getStore();
    const data = await store.stats();
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
