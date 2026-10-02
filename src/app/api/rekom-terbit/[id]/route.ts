// Penyaji berkas surat rekomendasi TERBIT dari bucket Storage "rekom-terbit".
// - Tampil di akun pemohon (detail pengajuan status terbit), sisi staf, dan
//   halaman verifikasi publik via QR (?qr={qrCodeId}).
// - kolom file_rekom_pdf_url berisi PATH berkas di bucket "rekom-terbit"
//   (contoh: RK-2026-XXXXX/1730000000-surat.pdf) -> redirect ke URL berkas.
// - Nilai warisan ("/api/..." atau "http...") tetap diikuti agar surat lama tak putus.
import { getSessionUser } from "@/lib/session";
import { getStore } from "@/lib/store";
import { SUPABASE_URL } from "@/lib/config";
import { createServerSupabase } from "@/lib/supabase/server";
import { halamanKesalahan } from "@/lib/halaman-kesalahan";
import type { PengajuanDTO } from "@/lib/types";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const qr = new URL(req.url).searchParams.get("qr");
  const store = await getStore();

  let pengajuan: PengajuanDTO | null = null;
  let berkasLangsung: string | null = null; // nilai dari RPC QR (akses publik tanpa sesi)

  // 1) sesi login — pemohon pemilik / staf (mengikuti RLS & canRead)
  const user = await getSessionUser();
  if (user) {
    pengajuan = await store.getPengajuan(user, id).catch(() => null);
  }

  // 2) akses publik via QR valid (halaman verifikasi surat)
  if (!pengajuan && qr) {
    const v = await store.verifySurat(qr).catch(() => null);
    if (v && v.pengajuanId === id) {
      // RPC security-definer: ambil path berkas surat terbit tanpa sesi.
      // Aman: hanya mengembalikan path untuk QR yang cocok & status terbit.
      const supabase = await createServerSupabase();
      if (supabase) {
        const { data } = await supabase.rpc("rekom_berkas_publik", { p_qr: qr });
        const val = Array.isArray(data) ? data[0] : data;
        if (typeof val === "string" && val.trim()) berkasLangsung = val.trim();
      }
      // cadangan bila RPC belum tersedia: coba baca internal (butuh service key)
      if (!berkasLangsung) {
        pengajuan = await store.getPengajuanInternal(id).catch(() => null);
      }
    }
  }

  if (!pengajuan && !berkasLangsung) {
    if (!user) {
      return halamanKesalahan(
        "Sesi Berakhir",
        "Untuk membuka surat rekomendasi, silakan masuk ke akun Anda terlebih dahulu, atau pindai kode QR yang tertera pada surat.",
        401,
        true
      );
    }
    return halamanKesalahan(
      "Akses Ditolak",
      "Anda tidak memiliki izin untuk membuka surat rekomendasi ini, atau surat belum terbit.",
      403
    );
  }

  const nilai = berkasLangsung ?? pengajuan?.fileRekomPdfUrl ?? null;

  // Belum ada berkas terbit -> teruskan ke PDF resmi tergenerasi (aturan aksesnya sendiri)
  if (!nilai) {
    const fallback = new URL(
      `/api/pengajuan/${id}/pdf${qr ? `?qr=${encodeURIComponent(qr)}` : ""}`,
      req.url
    );
    return Response.redirect(fallback.toString(), 302);
  }

  let target: string | null = null;
  if (/^https?:\/\//i.test(nilai)) {
    target = nilai;
  } else if (nilai.startsWith("/")) {
    target = new URL(nilai, req.url).toString();
  } else if (SUPABASE_URL && !nilai.includes("..") && !nilai.includes("\\")) {
    // path storage di bucket rekom-terbit -> URL publik berkas
    target = `${SUPABASE_URL}/storage/v1/object/public/rekom-terbit/${nilai
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
  }

  if (!target) {
    return halamanKesalahan(
      "Berkas Tidak Tersedia",
      "Berkas surat rekomendasi terbit tidak ditemukan pada penyimpanan. Silakan hubungi Admin TU Dinkes Kukar.",
      404
    );
  }

  return Response.redirect(target, 302);
}
