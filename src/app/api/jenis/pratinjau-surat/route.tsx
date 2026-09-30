import QRCode from "qrcode";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireUser } from "@/lib/session";
import { getStore } from "@/lib/store";
import { SuratRekomDocument } from "@/lib/pdf/surat";
import { parseTemplateSurat, renderSuratIsi, petaDataSurat, TEMPLATE_SURAT_DEFAULT } from "@/lib/surat-template";
import type { FormField, JenisRekomDTO } from "@/lib/types";
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

/**
 * POST /api/jenis/pratinjau-surat — PDF pratinjau surat dengan data contoh.
 * Body JSON: { jenisId?: string, templateSurat?: string | null }
 * - templateSurat diberikan -> pratinjau pakai template yang sedang diedit (belum disimpan)
 * - hanya jenisId           -> pratinjau pakai template tersimpan (atau default)
 * - keduanya kosong         -> pratinjau format default
 */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== "super_admin") {
    return Response.json({ error: "Hanya Super Admin yang dapat melihat pratinjau surat." }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const store = await getStore();

    let jenis: JenisRekomDTO | null = null;
    if (body?.jenisId) {
      const semua = await store.listJenis(false);
      jenis = semua.find((j) => j.id === body.jenisId) ?? null;
    }

    const tpl =
      body?.templateSurat !== undefined && body?.templateSurat !== null
        ? parseTemplateSurat(String(body.templateSurat))
        : parseTemplateSurat(jenis?.templateSurat ?? null);

    // ===== data contoh =====
    const fields: FormField[] = (() => {
      try {
        return (JSON.parse(jenis?.persyaratanJson || "{}").fields ?? []) as FormField[];
      } catch {
        return [];
      }
    })();
    const dataFormContoh: Record<string, string> = {};
    for (const f of fields) {
      if (f.type === "select" && f.options?.length) dataFormContoh[f.key] = f.options[0];
      else if (f.type === "date") dataFormContoh[f.key] = tanggalID(new Date());
      else if (f.type === "number") dataFormContoh[f.key] = "12";
      else dataFormContoh[f.key] = `Contoh ${f.label}`;
    }

    const templateNomor = jenis?.templateNomor ?? "440/{seq}/{kode}/Dinkes-Kukar/{year}";
    const nomorContoh = templateNomor
      .replaceAll("{seq}", "001")
      .replaceAll("{kode}", jenis?.kodeJenis ?? "SDMK")
      .replaceAll("{year}", String(new Date().getFullYear()));

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const verifikasiUrl = `${origin}/verifikasi/contoh-pratinjau`;
    const qrDataUrl = await QRCode.toDataURL(verifikasiUrl, { width: 220, margin: 1 });
    const kadis = await kadisInfo();

    const data = petaDataSurat({
      nomorSurat: nomorContoh,
      tglTerbitLabel: tanggalID(new Date()),
      namaPemohon: "Muhammad Contoh Pemohon",
      nipPemohon: "19700101 199003 1 001",
      instansiPemohon: "Puskesmas Tenggarong",
      jabatanPemohon: "Pegawai Administrasi",
      noHpPemohon: "0812-3456-7890",
      judul: "Pengajuan Contoh Pratinjau",
      jenisNama: jenis?.namaJenis ?? "Rekomendasi Contoh",
      kodeJenis: jenis?.kodeJenis ?? "SDMK",
      bidang: jenis?.bidang ?? "Sekretariat",
      namaKadis: kadis.nama,
      nipKadis: kadis.nip,
      dataForm: dataFormContoh,
    });

    const buffer = await renderToBuffer(
      <SuratRekomDocument
        nomorSurat={nomorContoh}
        tglTerbitLabel={tanggalID(new Date())}
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
        "Content-Disposition": 'inline; filename="pratinjau-surat.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
