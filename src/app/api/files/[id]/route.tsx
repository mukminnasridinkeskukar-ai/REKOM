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

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getSessionUser();

  // 1) berkas hasil upload lokal (Mode Demo) — nama file tak terka, tetap wajib login
  if (uuidExt.test(id)) {
    if (!user) return Response.json({ error: "Akses ditolak." }, { status: 401 });
    try {
      const data = await readFile(path.join(UPLOAD_DIR, id));
      return new Response(new Uint8Array(data), {
        headers: { "Cache-Control": "private, max-age=3600" },
      });
    } catch {
      return Response.json(
        {
          error:
            "Berkas tidak ditemukan di penyimpanan server. Berkas lama kemungkinan terunggah dengan metode sementara — mohon unggah ulang dokumen ini.",
        },
        { status: 404 }
      );
    }
  }

  // 2) dokumen pendukung berdasarkan ID
  const store = await getStore();
  const doc = await store.getDokumen(id).catch(() => null);
  if (!doc) return Response.json({ error: "Dokumen tidak ditemukan." }, { status: 404 });

  if (user) {
    const allowed = await store
      .getPengajuan(user, doc.pengajuanId)
      .then((p) => Boolean(p))
      .catch(() => false);
    if (!allowed) return Response.json({ error: "Akses ditolak." }, { status: 403 });
  } else if (!doc.fileUrl.startsWith("demo:")) {
    return Response.json({ error: "Akses ditolak." }, { status: 401 });
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
        return Response.json({ error: "Berkas tidak ditemukan di penyimpanan server." }, { status: 404 });
      }
    }
    return Response.json(
      {
        error:
          "Dokumen ini terunggah dengan metode lama sehingga berkasnya tidak tersimpan permanen. Mohon unggah ulang dokumen ini.",
      },
      { status: 410 }
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

  return Response.json(
    { error: "Berkas tidak tersedia di Storage. Mohon periksa bucket dokumen-rekom atau unggah ulang." },
    { status: 404 }
  );
}
