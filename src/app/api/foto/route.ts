import { requireUser } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/config";
import { createServerSupabase } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/** Nama bucket Supabase Storage tempat foto profil disimpan (publik utk dibaca). */
export const FOTO_BUCKET = "foto-profil";
const MAKS_BYTES = 5 * 1024 * 1024; // 5 MB — klien meresize ke 512px, jadi biasanya < 200 KB
const TIPE_OK = ["image/jpeg", "image/png", "image/webp"];

/**
 * POST /api/foto — unggah / ganti foto profil user yang sedang login.
 * Body: multipart/form-data dengan field "file" (gambar).
 * - Mode Supabase: disimpan ke Storage bucket "foto-profil/{uid}/avatar-<timestamp>.<ext>",
 *   lalu profiles.foto_url diisi URL publiknya.
 * - Mode Demo: disimpan sebagai data-URL base64 di kolom User.fotoUrl (lokal saja).
 */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const uid = auth.user.id;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "File foto tidak ditemukan." }, { status: 400 });
  }
  if (!TIPE_OK.includes(file.type)) {
    return Response.json({ error: "Format foto harus JPG, PNG, atau WebP." }, { status: 400 });
  }
  if (file.size > MAKS_BYTES) {
    return Response.json({ error: "Ukuran foto maksimal 5 MB." }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    if (!supabase) return Response.json({ error: "Supabase belum siap." }, { status: 500 });

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${uid}/avatar-${Date.now()}.${ext}`;

    const { error: errUnggah } = await supabase.storage
      .from(FOTO_BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (errUnggah) {
      const pesan = errUnggah.message.toLowerCase().includes("bucket not found")
        ? `Bucket "${FOTO_BUCKET}" belum ada di Supabase Storage — jalankan SQL setup (supabase-foto.sql) atau buat bucket publik bernama ${FOTO_BUCKET}.`
        : errUnggah.message;
      return Response.json({ error: pesan }, { status: 400 });
    }

    const { data } = supabase.storage.from(FOTO_BUCKET).getPublicUrl(path);
    const fotoUrl = data.publicUrl;

    const { error: errUpdate } = await supabase
      .from("profiles")
      .update({ foto_url: fotoUrl })
      .eq("id", uid);
    if (errUpdate) return Response.json({ error: errUpdate.message }, { status: 400 });

    return Response.json({ ok: true, fotoUrl });
  }

  // ==== Mode Demo (lokal) — simpan sebagai data-URL ====
  const buf = Buffer.from(await file.arrayBuffer());
  const fotoUrl = `data:${file.type};base64,${buf.toString("base64")}`;
  await db.user.update({ where: { id: uid }, data: { fotoUrl } });
  return Response.json({ ok: true, fotoUrl });
}

/** DELETE /api/foto — hapus foto profil user yang sedang login. */
export async function DELETE() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const uid = auth.user.id;

  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    if (!supabase) return Response.json({ error: "Supabase belum siap." }, { status: 500 });

    // hapus semua object di folder user (abaikan galat bila bucket belum ada)
    const { data: daftar } = await supabase.storage.from(FOTO_BUCKET).list(uid);
    if (daftar && daftar.length > 0) {
      await supabase.storage
        .from(FOTO_BUCKET)
        .remove(daftar.map((f) => `${uid}/${f.name}`));
    }
    await supabase.from("profiles").update({ foto_url: null }).eq("id", uid);
    return Response.json({ ok: true });
  }

  await db.user.update({ where: { id: uid }, data: { fotoUrl: null } });
  return Response.json({ ok: true });
}
