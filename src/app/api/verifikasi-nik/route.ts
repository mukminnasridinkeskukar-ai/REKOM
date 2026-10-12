// Verifikasi publik surat rekomendasi TERBIT via NIK pemohon (tanpa login).
// - Input: NIK 16 digit -> daftar surat terbit atas nama pemohon tersebut.
// - Berkas diunduh lewat /api/rekom-terbit/{id}?nik={nik} (validasi ulang di sana).
// - Pembatas laju sederhana per IP (anti pencobaan NIK).
import { getStore } from "@/lib/store";

const JENDELA_MS = 5 * 60 * 1000; // 5 menit
const MAKS_PER_JENDELA = 15; // 15 permintaan / IP / 5 menit

const log = new Map<string, number[]>();

function kelebihanBatas(ip: string): boolean {
  const kini = Date.now();
  const daftar = (log.get(ip) ?? []).filter((t) => kini - t < JENDELA_MS);
  daftar.push(kini);
  log.set(ip, daftar);
  if (log.size > 5000) {
    // bereskan antrean agar memori tidak tumbuh tanpa batas
    for (const [k, v] of log) {
      if (v.every((t) => kini - t >= JENDELA_MS)) log.delete(k);
    }
  }
  return daftar.length > MAKS_PER_JENDELA;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "lokal";

  if (kelebihanBatas(ip)) {
    return Response.json(
      { error: "Terlalu banyak percobaan. Silakan coba lagi beberapa menit lagi." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const nik = String(body?.nik ?? "").replace(/\D/g, "");
  if (nik.length !== 16) {
    return Response.json(
      { error: "NIK harus 16 digit angka sesuai KTP." },
      { status: 400 }
    );
  }

  try {
    const store = await getStore();
    const data = await store.verifikasiNik(nik);
    return Response.json({ data });
  } catch {
    return Response.json(
      { error: "Gagal memverifikasi. Silakan coba lagi nanti." },
      { status: 500 }
    );
  }
}
