// E-REKOM — matriks hak akses workflow (dipakai server & klien)
import type { AksiTersedia, Role, Status } from "@/lib/types";

export interface AccessCtx {
  role: Role;
  bidang: string | null; // bidang user (untuk verifikator)
  userId: string; // user yang sedang login
  pemohonId: string; // pemilik pengajuan
  jenisBidang: string; // bidang tujuan jenis rekom
  status: Status;
}

/** Boleh membuka/melihat detail pengajuan? */
export function canRead(ctx: AccessCtx): boolean {
  switch (ctx.role) {
    case "pemohon":
      return ctx.userId === ctx.pemohonId;
    case "verifikator_bidang":
      return ctx.bidang === ctx.jenisBidang;
    case "admin_tu":
    case "kabid":
    case "kadis":
    case "super_admin":
      return true;
    default:
      return false;
  }
}

/** Daftar aksi workflow yang boleh dilakukan pada pengajuan ini */
export function computeAksi(ctx: AccessCtx): AksiTersedia[] {
  const own = ctx.role === "pemohon";
  const verifikatorSesuai =
    ctx.role === "verifikator_bidang" && ctx.bidang === ctx.jenisBidang;

  switch (ctx.status) {
    case "draft":
      return own ? ["submit"] : [];
    case "perlu_perbaikan":
      return own ? ["perbaiki"] : [];
    case "diajukan":
      return verifikatorSesuai ? ["verifikasi", "kembalikan", "tolak"] : [];
    case "diverifikasi_bidang":
      return ctx.role === "kabid" ? ["setujui"] : [];
    case "disetujui_kabid":
      return ctx.role === "admin_tu" ? ["beri_nomor"] : [];
    case "menunggu_ttd_kadis":
      return ctx.role === "kadis" ? ["terbitkan"] : [];
    default:
      return [];
  }
}

export const LABEL_AKSI: Record<AksiTersedia, string> = {
  submit: "Ajukan Sekarang",
  perbaiki: "Perbaiki Berkas",
  verifikasi: "Setujui Verifikasi",
  kembalikan: "Kembalikan untuk Perbaikan",
  tolak: "Tolak Pengajuan",
  setujui: "Setujui (Kabid)",
  beri_nomor: "Beri Nomor Surat",
  terbitkan: "Tanda Tangan & Terbitkan",
};

export const IZIN_ADMIN_JENIS: Role[] = ["super_admin"];
export const IZIN_KELola_USER: Role[] = ["super_admin"];
