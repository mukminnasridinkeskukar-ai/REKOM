// E-REKOM — Tipe data & konstanta bersama

export type Role =
  | "pemohon"
  | "verifikator_bidang"
  | "admin_tu"
  | "kabid"
  | "kadis"
  | "super_admin";

export const ROLE_LABEL: Record<Role, string> = {
  pemohon: "Pemohon",
  verifikator_bidang: "Verifikator Bidang",
  admin_tu: "Admin TU",
  kabid: "Kabid",
  kadis: "Kepala Dinas",
  super_admin: "Super Admin",
};

export type Bidang = "SDMK" | "Yankes" | "Farmalkes" | "Sekretariat";

export const BIDANG_LIST: Bidang[] = ["SDMK", "Yankes", "Farmalkes", "Sekretariat"];

export type Status =
  | "draft"
  | "diajukan"
  | "diverifikasi_bidang"
  | "perlu_perbaikan"
  | "disetujui_kabid"
  | "menunggu_ttd_kadis"
  | "terbit"
  | "ditolak";

export const STATUS_ORDER: Status[] = [
  "draft",
  "diajukan",
  "diverifikasi_bidang",
  "disetujui_kabid",
  "menunggu_ttd_kadis",
  "terbit",
];

export interface StatusMeta {
  label: string;
  /** kelas badge tailwind */
  badge: string;
  /** warna titik / ikon (hex) */
  color: string;
  deskripsi: string;
}

export const STATUS_META: Record<Status, StatusMeta> = {
  draft: {
    label: "Draft",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    color: "#64748b",
    deskripsi: "Pengajuan masih draf, belum dikirim.",
  },
  diajukan: {
    label: "Diajukan",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    color: "#f59e0b",
    deskripsi: "Menunggu verifikasi bidang.",
  },
  diverifikasi_bidang: {
    label: "Diverifikasi Bidang",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    color: "#2563eb",
    deskripsi: "Berkas diverifikasi dan diteruskan ke Kabid.",
  },
  perlu_perbaikan: {
    label: "Perlu Perbaikan",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
    color: "#ea580c",
    deskripsi: "Berkas dikembalikan untuk diperbaiki pemohon.",
  },
  disetujui_kabid: {
    label: "Disetujui Kabid",
    badge: "bg-violet-100 text-violet-800 border-violet-200",
    color: "#7c3aed",
    deskripsi: "Disetujui Kabid, menunggu penomoran surat.",
  },
  menunggu_ttd_kadis: {
    label: "Menunggu TTD Kadis",
    badge: "bg-cyan-100 text-cyan-800 border-cyan-200",
    color: "#0891b2",
    deskripsi: "Nomor surat terbit, menunggu tanda tangan Kadis.",
  },
  terbit: {
    label: "Terbit",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    color: "#059669",
    deskripsi: "Surat rekomendasi resmi telah terbit.",
  },
  ditolak: {
    label: "Ditolak",
    badge: "bg-red-100 text-red-800 border-red-200",
    color: "#dc2626",
    deskripsi: "Pengajuan ditolak.",
  },
};

/** Struktur persyaratan_json di master_jenis_rekom */
export interface Persyaratan {
  fields: FormField[];
  dokumen: DokumenReq[];
}

export interface FormField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "select";
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface DokumenReq {
  nama: string;
  required: boolean;
}

export interface JenisRekomDTO {
  id: string;
  kodeJenis: string;
  namaJenis: string;
  deskripsi: string | null;
  icon: string;
  warna: string;
  bidang: string;
  persyaratanJson: string;
  templateNomor: string;
  isActive: boolean;
  urutan: number;
}

export interface PemohonDTO {
  id: string;
  namaLengkap: string;
  asalInstansi: string | null;
  jabatan: string | null;
  noHp: string | null;
  nik: string | null;
}

export interface DokumenDTO {
  id: string;
  namaDokumen: string;
  fileUrl: string;
  tipeFile: string;
  ukuran: number;
}

export interface TrackingDTO {
  id: string;
  dariStatus: string | null;
  keStatus: string;
  olehNama: string | null;
  catatan: string | null;
  createdAt: string;
}

export type AksiTersedia =
  | "submit"
  | "perbaiki"
  | "verifikasi"
  | "kembalikan"
  | "tolak"
  | "setujui"
  | "beri_nomor"
  | "terbitkan";

export interface PengajuanDTO {
  id: string;
  kode: string; // kode tampil pendek, contoh RK-2026-0001
  jenis: JenisRekomDTO | null;
  pemohon: PemohonDTO | null;
  judulPengajuan: string;
  dataFormJson: string;
  status: Status;
  catatanVerifikator: string | null;
  nomorSurat: string | null;
  tglTerbit: string | null;
  fileRekomPdfUrl: string | null;
  qrCodeId: string | null;
  createdAt: string;
  updatedAt: string;
  dokumen: DokumenDTO[];
  tracking: TrackingDTO[];
  aksi: AksiTersedia[]; // aksi yang boleh dilakukan user saat ini
}

export interface NotificationDTO {
  id: string;
  pengajuanId: string | null;
  judul: string;
  pesan: string;
  isRead: boolean;
  createdAt: string;
}

export interface MeDTO {
  id: string;
  email: string;
  namaLengkap: string;
  nik: string | null;
  noHp: string | null;
  asalInstansi: string | null;
  jabatan: string | null;
  role: Role;
  bidang: string | null;
  fotoUrl: string | null;
}

export const BIDANG_KODE: Record<string, string> = {
  SDMK: "SDMK",
  Yankes: "YK",
  Farmalkes: "FAR",
  Sekretariat: "SET",
};

/** URL halaman verifikasi publik dari sebuah QR id */
export function verifikasiUrl(qrCodeId: string, origin?: string): string {
  return `${origin ?? ""}/verifikasi/${qrCodeId}`;
}
