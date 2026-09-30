import QRCode from "qrcode";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSessionUser } from "@/lib/session";
import { getStore } from "@/lib/store";
import { SuratRekomDocument } from "@/lib/pdf/surat";
import { parseTemplateSurat, renderSuratIsi, petaDataSurat } from "@/lib/surat-template";
import { isSupabaseConfigured } from "@/lib/config";
import { createServerSupabase } from "@/lib/supabase/server";
import { db } from "@/lib/db";

const tanggalID = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(d);

async function kadisInfo(): Promise<{ nama: string; nip: string }> {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    const { data } = await supabase!
      .from("profiles")
      .select("nama_lengkap, nik")
      .eq("role", "kadis")
      .limit(1)
      .maybeSingle();
    return {
      nama: (data?.nama_lengkap as string) ?? "Kepala Dinas Kesehatan",
      nip: (data?.nik as string) ?? "-",
    };
  }
  const u = await db.user.findFirst({ where: { role: "kadis" } });
  return { nama: u?.namaLengkap ?? "Kepala Dinas Kesehatan", nip: u?.nik ?? "-" };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const qr = searchParams.get("qr");

  try {
    const store = await getStore();
    let pengajuan = null;
    let authorized = false;

    if (qr) {
      // akses publik via QR — hanya untuk surat yang sudah terbit
      const v = await store.verifySurat(qr);
      if (v && v.pengajuanId === id) authorized = true;
    }
    if (!authorized) {
      const user = await getSessionUser();
      if (!user) {
        return Response.json({ error: "Akses ditolak. Login atau pindai QR yang valid." }, { status: 401 });
      }
      pengajuan = await store.getPengajuan(user, id);
      if (pengajuan) authorized = true;
    }
    if (!authorized) {
      return Response.json({ error: "Akses ditolak." }, { status: 403 });
    }
    pengajuan = pengajuan ?? (await store.getPengajuanInternal(id));
    if (!pengajuan) return Response.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });

    const origin =
      req.headers.get("origin") ??
      process.env.NEXT_PUBLIC_APP_URL ??
      new URL(req.url).origin;
    const verifikasiUrl = pengajuan.qrCodeId ? `${origin}/verifikasi/${pengajuan.qrCodeId}` : origin;
    const qrDataUrl = await QRCode.toDataURL(verifikasiUrl, { width: 220, margin: 1 });

    const kadis = await kadisInfo();
    const dataForm = JSON.parse(pengajuan.dataFormJson || "{}") as Record<string, unknown>;

    // Isi surat dari template jenis rekomendasi (bisa diedit admin) + data pengajuan
    const tpl = parseTemplateSurat(pengajuan.jenis?.templateSurat ?? null);
    const data = petaDataSurat({
      nomorSurat: pengajuan.nomorSurat ?? "-",
      tglTerbitLabel: tanggalID(pengajuan.tglTerbit ? new Date(pengajuan.tglTerbit) : new Date()),
      namaPemohon: pengajuan.pemohon?.namaLengkap ?? "-",
      nipPemohon: pengajuan.pemohon?.nik ?? "",
      instansiPemohon: pengajuan.pemohon?.asalInstansi ?? "",
      jabatanPemohon: pengajuan.pemohon?.jabatan ?? "",
      noHpPemohon: pengajuan.pemohon?.noHp ?? "",
      judul: pengajuan.judulPengajuan,
      jenisNama: pengajuan.jenis?.namaJenis ?? "Rekomendasi",
      kodeJenis: pengajuan.jenis?.kodeJenis ?? "",
      bidang: pengajuan.jenis?.bidang ?? "",
      namaKadis: kadis.nama,
      nipKadis: kadis.nip,
      dataForm,
    });

    const buffer = await renderToBuffer(
      <SuratRekomDocument
        nomorSurat={pengajuan.nomorSurat ?? "-"}
        tglTerbitLabel={tanggalID(pengajuan.tglTerbit ? new Date(pengajuan.tglTerbit) : new Date())}
        verifikasiUrl={verifikasiUrl}
        qrDataUrl={qrDataUrl}
        namaKadis={kadis.nama}
        nipKadis={kadis.nip}
        isi={renderSuratIsi(tpl, data)}
      />
    );

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="surat-rekomendasi-${pengajuan.nomorSurat?.replace(/\//g, "-") ?? id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
