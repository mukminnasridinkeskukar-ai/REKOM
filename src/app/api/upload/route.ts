// Unggah berkas pendukung (Mode Demo) -> disimpan lokal, disajikan via /api/files/{uuid.ext}
// Pada Mode Supabase, unggah dilakukan langsung dari browser ke Storage bucket
// "dokumen-rekom" (lihat components/file-uploader.tsx), sehingga endpoint ini tidak dipakai.
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getSessionUser } from "@/lib/session";

/** Folder penyimpanan berkas unggahan Mode Demo */
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const MAX_BYTES = 5 * 1024 * 1024; // 5MB (selaras validasi sisi klien)

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Akses ditolak." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Berkas tidak ditemukan." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Berkas melebihi 5MB." }, { status: 413 });
  }

  // Nama tersimpan acak (UUID) agar tak terka; ekstensi dibersihkan dari karakter berbahaya
  const extRaw = (path.extname(file.name) || "").toLowerCase();
  const ext = /^\.[a-z0-9]{1,9}$/.test(extRaw) ? extRaw : ".bin";
  const nama = `${crypto.randomUUID()}${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, nama), Buffer.from(await file.arrayBuffer()));

  return Response.json({ data: { fileUrl: `/api/files/${nama}` } });
}
