"use client";

/**
 * Resize + crop tengah (cover) gambar menjadi persegi, siap dipakai sebagai
 * foto profil. Output JPEG agar ukuran kecil (biasanya 20-80 KB untuk 512px).
 */
export async function resizeGambarPersegi(
  file: File | Blob,
  sisi = 512,
  kualitas = 0.85
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const sumber = Math.min(bitmap.width, bitmap.height);
  const kanvas = document.createElement("canvas");
  kanvas.width = sisi;
  kanvas.height = sisi;
  const ctx = kanvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung browser ini.");
  ctx.drawImage(
    bitmap,
    (bitmap.width - sumber) / 2, // crop tengah agar wajah tidak melenceng
    (bitmap.height - sumber) / 2,
    sumber,
    sumber,
    0,
    0,
    sisi,
    sisi
  );
  bitmap.close?.();
  return await new Promise<Blob>((resolve, reject) =>
    kanvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Gagal memproses gambar."))),
      "image/jpeg",
      kualitas
    )
  );
}
