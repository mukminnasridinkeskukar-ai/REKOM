// Penyajian file dokumen pendukung (Mode Demo) dengan pemeriksaan akses.
// - /api/files/{dokumenId}      -> cari dokumen di DB; demo: placeholder PDF; supabase: redirect signed URL
// - /api/files/{uuid.ext}       -> berkas hasil upload lokal (wajib login)
import React from "react";
import { readFile } from "fs/promises";
import path from "path";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { getSessionUser } from "@/lib/session";
import { getStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/config";
import { UPLOAD_DIR } from "@/app/api/upload/route";

const styles = StyleSheet.create({
  page: { paddingTop: 80, paddingHorizontal: 56, fontSize: 12, fontFamily: "Helvetica" },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    padding: 4,
    borderRadius: 4,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 14,
  },
  title: { fontFamily: "Helvetica-Bold", fontSize: 16 },
  sub: { marginTop: 8, color: "#374151", lineHeight: 1.6 },
  box: {
    marginTop: 28,
    borderWidth: 1.4,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 40,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
});

function PlaceholderDoc({ nama }: { nama: string }) {
  return (
    <Document title={`Dokumen: ${nama}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.badge}>MODE DEMO</Text>
        <Text style={styles.title}>{nama}</Text>
        <Text style={styles.sub}>
          Berkas pendukung contoh pada Mode Demo E-REKOM Dinas Kesehatan Kabupaten Kutai Kartanegara. Pada
          implementasi produksi, bagian ini berisi hasil pindaian dokumen persyaratan yang diunggah pemohon.
        </Text>
        <View style={styles.box}>
          <Text style={{ color: "#64748B", fontSize: 10 }}>
            Pratinjau isi dokumen persyaratan
          </Text>
        </View>
      </Page>
    </Document>
  );
}

const pdfCache = new Map<string, Uint8Array>();

async function placeholderPdf(nama: string): Promise<Uint8Array> {
  const cached = pdfCache.get(nama);
  if (cached) return cached;
  const buffer = await renderToBuffer(<PlaceholderDoc nama={nama} />);
  const bytes = new Uint8Array(buffer);
  pdfCache.set(nama, bytes);
  return bytes;
}

const uuidExt = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,10}$/i;

/** Halaman kesalahan ramah (bukan JSON mentah) untuk dibuka di tab baru. */
function halamanKesalahan(judul: string, pesan: string, status: number, tombolMasuk = false): Response {
  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${judul} — E-REKOM Dinkes Kukar</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    background: linear-gradient(135deg, #0f3d3a, #14655e, #157a70); padding: 24px;
  }
  .kartu { background: #fff; border-radius: 24px; box-shadow: 0 25px 60px rgba(0,0,0,.35);
    max-width: 460px; width: 100%; padding: 40px 32px; text-align: center; }
  .ikon { width: 56px; height: 56px; margin: 0 auto 18px; border-radius: 16px; background: #FEF3C7;
    display: flex; align-items: center; justify-content: center; font-size: 28px; }
  h1 { font-size: 19px; color: #1e293b; margin-bottom: 10px; }
  p { font-size: 13.5px; line-height: 1.7; color: #64748b; }
  .aksi { margin-top: 24px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  a.tombol { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 12px;
    font-size: 13px; font-weight: 600; text-decoration: none; transition: opacity .15s; }
  a.tombol:hover { opacity: .88; }
  .utama { background: #14655e; color: #fff; }
  .negasi { background: #f1f5f9; color: #334155; }
  .jenama { margin-top: 26px; font-size: 10.5px; color: #94a3b8; letter-spacing: .04em; }
</style>
</head>
<body>
  <div class="kartu">
    <div class="ikon">📄</div>
    <h1>${judul}</h1>
    <p>${pesan}</p>
    <div class="aksi">
      <a class="tombol negasi" href="javascript:history.back()">← Kembali</a>
      ${tombolMasuk ? '<a class="tombol utama" href="/login">Masuk ke Akun</a>' : '<a class="tombol utama" href="/">Halaman Utama</a>'}
    </div>
    <p class="jenama">E-REKOM · DINAS KESEHATAN KAB. KUTAI KARTANEGARA</p>
  </div>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getSessionUser();

  // 1) berkas hasil upload lokal (Mode Demo) — nama file tak terka, tetap wajib login
  if (uuidExt.test(id)) {
    if (!user)
      return halamanKesalahan(
        "Sesi Berakhir",
        "Untuk membuka dokumen, silakan masuk ke akun Anda terlebih dahulu, lalu buka kembali dokumen dari halaman pengajuan.",
        401,
        true
      );
    try {
      const data = await readFile(path.join(UPLOAD_DIR, id));
      return new Response(new Uint8Array(data), {
        headers: { "Cache-Control": "private, max-age=3600" },
      });
    } catch {
      return halamanKesalahan(
        "Berkas Tidak Tersedia",
        "Berkas ini tidak ditemukan di penyimpanan server. Dokumen lama kemungkinan terunggah dengan metode sementara sebelum sistem berpindah ke penyimpanan permanen — mohon unggah ulang dokumen ini melalui menu Perbaiki Pengajuan.",
        404
      );
    }
  }

  // 2) dokumen pendukung berdasarkan ID
  const store = await getStore();
  const doc = await store.getDokumen(id).catch(() => null);
  if (!doc)
    return halamanKesalahan("Dokumen Tidak Ditemukan", "Dokumen yang Anda buka tidak terdaftar pada sistem E-REKOM.", 404);

  if (user) {
    const allowed = await store
      .getPengajuan(user, doc.pengajuanId)
      .then((p) => Boolean(p))
      .catch(() => false);
    if (!allowed)
      return halamanKesalahan("Akses Ditolak", "Anda tidak memiliki izin untuk membuka dokumen pengajuan ini.", 403);
  } else if (!doc.fileUrl.startsWith("demo:")) {
    return halamanKesalahan(
      "Sesi Berakhir",
      "Untuk membuka dokumen, silakan masuk ke akun Anda terlebih dahulu, lalu buka kembali dokumen dari halaman pengajuan.",
      401,
      true
    );
  }

  if (doc.fileUrl.startsWith("demo:")) {
    const bytes = await placeholderPdf(doc.namaDokumen);
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.namaDokumen.replace(/[^a-zA-Z0-9]+/g, "-")}.pdf"`,
      },
    });
  }

  // Berkas lama ber-path lokal (/api/files/...) — di Mode Demo masih dibaca dari
  // penyimpanan lokal; di produksi berkasnya sudah hilang -> 410 (unggah ulang)
  if (doc.fileUrl.startsWith("/api/files/")) {
    const namaLokal = doc.fileUrl.split("/").pop() ?? "";
    if (!isSupabaseConfigured() && uuidExt.test(namaLokal)) {
      try {
        const data = await readFile(path.join(UPLOAD_DIR, namaLokal));
        return new Response(new Uint8Array(data), {
          headers: { "Cache-Control": "private, max-age=3600" },
        });
      } catch {
        return halamanKesalahan(
          "Berkas Tidak Tersedia",
          "Berkas ini tidak ditemukan di penyimpanan lokal server.",
          404
        );
      }
    }
    return halamanKesalahan(
      "Berkas Tidak Tersedia",
      "Dokumen ini terunggah dengan metode lama sehingga berkasnya tidak tersimpan permanen di server. Mohon unggah ulang dokumen ini melalui menu Perbaiki Pengajuan.",
      410
    );
  }

  // supabase storage path -> redirect signed URL (1 jam)
  if (!doc.fileUrl.startsWith("/api/") && !doc.fileUrl.startsWith("http")) {
    const { createServerSupabase } = await import("@/lib/supabase/server");
    const supabase = await createServerSupabase();
    if (supabase) {
      const { data } = await supabase.storage
        .from("dokumen-rekom")
        .createSignedUrl(doc.fileUrl, 3600);
      if (data?.signedUrl) return Response.redirect(data.signedUrl, 302);
    }
  }

  return halamanKesalahan(
    "Berkas Tidak Tersedia",
    "Berkas tidak ditemukan di penyimpanan Storage (bucket dokumen-rekom). Kemungkinan berkas terhapus atau gagal unggah — silakan unggah ulang melalui menu Perbaiki Pengajuan.",
    404
  );
}
