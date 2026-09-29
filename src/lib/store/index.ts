// E-REKOM — Abstraksi data store.
// dua implementasi: demo-store (Prisma/SQLite, sandbox preview) & supabase-store (produksi).
import type {
  JenisRekomDTO,
  NotificationDTO,
  PengajuanDTO,
  Status,
} from "@/lib/types";
import type { SessionUser } from "@/lib/session";

export interface PengajuanFilters {
  q?: string;
  jenisId?: string;
  status?: Status;
  from?: string; // ISO date
  to?: string; // ISO date
}

export interface JenisInput {
  kodeJenis: string;
  namaJenis: string;
  deskripsi?: string | null;
  icon: string;
  warna: string;
  bidang: string;
  persyaratanJson: string;
  templateNomor: string;
  isActive: boolean;
  urutan: number;
}

export interface CreatePengajuanInput {
  jenisId: string;
  judulPengajuan: string;
  dataFormJson: string;
}

export interface DokumenMeta {
  namaDokumen: string;
  fileUrl: string;
  tipeFile: string;
  ukuran: number;
}

export interface ActionInput {
  action: string;
  catatan?: string;
}

export interface AdminUserDTO {
  id: string;
  email: string;
  namaLengkap: string;
  nik: string | null;
  noHp: string | null;
  asalInstansi: string | null;
  jabatan: string | null;
  role: string;
  bidang: string | null;
  fotoUrl: string | null;
}

export interface StatsDTO {
  totalPengajuan: number;
  diajukan: number; // menunggu verifikasi
  terbit: number;
  perluPerbaikan: number;
  terbitBulanIni: number;
  totalJenis: number;
}

export interface VerifyDTO {
  valid: boolean;
  nomorSurat: string;
  jenisNama: string;
  judulPengajuan: string;
  pemohonNama: string;
  asalInstansi: string | null;
  tglTerbit: string;
  namaKadis: string;
  pengajuanId: string;
  qrCodeId: string;
}

export interface Store {
  // jenis rekomendasi
  listJenis(activeOnly: boolean): Promise<JenisRekomDTO[]>;
  createJenis(data: JenisInput): Promise<JenisRekomDTO>;
  updateJenis(id: string, data: Partial<JenisInput>): Promise<void>;
  deleteJenis(id: string): Promise<void>;

  // pengajuan
  listPengajuan(user: SessionUser, f: PengajuanFilters): Promise<PengajuanDTO[]>;
  getPengajuan(user: SessionUser, id: string): Promise<PengajuanDTO | null>;
  createPengajuan(user: SessionUser, input: CreatePengajuanInput): Promise<string>;
  updateForm(
    user: SessionUser,
    id: string,
    judul: string,
    dataFormJson: string
  ): Promise<void>;
  applyAction(
    user: SessionUser,
    id: string,
    input: ActionInput
  ): Promise<{ ok: boolean; error?: string }>;
  addDokumen(
    user: SessionUser,
    pengajuanId: string,
    meta: DokumenMeta
  ): Promise<void>;
  removeDokumen(user: SessionUser, dokId: string): Promise<void>;
  getDokumen(
    dokId: string
  ): Promise<DokumenMeta & { id: string; pengajuanId: string } | null>;

  // notifikasi
  listNotifications(user: SessionUser): Promise<NotificationDTO[]>;
  markNotificationsRead(user: SessionUser, ids?: string[]): Promise<void>;

  // manajemen user (super admin)
  listUsers(): Promise<AdminUserDTO[]>;
  updateUserRole(targetId: string, role: string, bidang: string | null): Promise<void>;

  // statistik & verifikasi publik
  stats(): Promise<StatsDTO>;
  verifySurat(qrCodeId: string): Promise<VerifyDTO | null>;

  /** Muat pengajuan tanpa konteks user (khusus server: render PDF / kebutuhan internal). */
  getPengajuanInternal(id: string): Promise<PengajuanDTO | null>;
}

/** Pilih store aktif: Supabase bila env terisi, selain itu Mode Demo (Prisma). */
export async function getStore(): Promise<Store> {
  const { isSupabaseConfigured } = await import("@/lib/config");
  if (isSupabaseConfigured()) {
    const { SupabaseStore } = await import("@/lib/store/supabase-store");
    return new SupabaseStore();
  }
  const { ensureSeeded } = await import("@/lib/demo/seed");
  await ensureSeeded();
  const { DemoStore } = await import("@/lib/store/demo-store");
  return new DemoStore();
}
