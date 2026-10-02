// E-REKOM — Store implementasi untuk MODE DEMO (Prisma/SQLite).
// Dipakai ketika env Supabase belum dikonfigurasi (sandbox preview / uji lokal).
import { db } from "@/lib/db";
import type { Store, PengajuanFilters, JenisInput, CreatePengajuanInput, DokumenMeta, ActionInput, AdminUserDTO, StatsDTO, VerifyDTO } from "@/lib/store";
import type { SessionUser } from "@/lib/session";
import type { JenisRekomDTO, NotificationDTO, PengajuanDTO, Status } from "@/lib/types";
import { computeAksi, canRead } from "@/lib/permissions";
import { randomUUID } from "crypto";

type PrismaPengajuan = {
  id: string;
  pemohonId: string;
  jenisId: string;
  judulPengajuan: string;
  dataFormJson: string;
  status: string;
  catatanVerifikator: string | null;
  nomorSurat: string | null;
  tglTerbit: Date | null;
  fileRekomPdfUrl: string | null;
  qrCodeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  pemohon: {
    id: string;
    namaLengkap: string;
    asalInstansi: string | null;
    jabatan: string | null;
    noHp: string | null;
    nik: string | null;
  } | null;
  jenis: {
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
  } | null;
  dokumen: { id: string; namaDokumen: string; fileUrl: string; tipeFile: string; ukuran: number }[];
  tracking: {
    id: string;
    dariStatus: string | null;
    keStatus: string;
    olehNama: string | null;
    catatan: string | null;
    createdAt: Date;
  }[];
};

function kodePengajuan(id: string, createdAt: Date): string {
  const suffix = id.replace(/[^a-zA-Z0-9]/g, "").slice(-5).toUpperCase();
  return `RK-${createdAt.getFullYear()}-${suffix}`;
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function toJenisDTO(j: NonNullable<PrismaPengajuan["jenis"]>): JenisRekomDTO {
  return {
    id: j.id,
    kodeJenis: j.kodeJenis,
    namaJenis: j.namaJenis,
    deskripsi: j.deskripsi,
    icon: j.icon,
    warna: j.warna,
    bidang: j.bidang,
    persyaratanJson: j.persyaratanJson,
    templateNomor: j.templateNomor,
    isActive: j.isActive,
    urutan: j.urutan,
    templateSurat: (j as { templateSurat?: string | null }).templateSurat ?? null,
  };
}

function toDTO(p: PrismaPengajuan, user: SessionUser): PengajuanDTO {
  const jenis = p.jenis ? toJenisDTO(p.jenis) : null;
  const status = p.status as Status;
  const aksi = canRead({
    role: user.role,
    bidang: user.bidang,
    userId: user.id,
    pemohonId: p.pemohonId,
    jenisBidang: p.jenis?.bidang ?? "",
    status,
  })
    ? computeAksi({
        role: user.role,
        bidang: user.bidang,
        userId: user.id,
        pemohonId: p.pemohonId,
        jenisBidang: p.jenis?.bidang ?? "",
        status,
      })
    : [];
  return {
    id: p.id,
    kode: kodePengajuan(p.id, p.createdAt),
    jenis,
    pemohon: p.pemohon
      ? {
          id: p.pemohon.id,
          namaLengkap: p.pemohon.namaLengkap,
          asalInstansi: p.pemohon.asalInstansi,
          jabatan: p.pemohon.jabatan,
          noHp: p.pemohon.noHp,
          nik: p.pemohon.nik,
        }
      : null,
    judulPengajuan: p.judulPengajuan,
    dataFormJson: p.dataFormJson,
    status,
    catatanVerifikator: p.catatanVerifikator,
    nomorSurat: p.nomorSurat,
    tglTerbit: iso(p.tglTerbit),
    fileRekomPdfUrl: p.fileRekomPdfUrl,
    qrCodeId: p.qrCodeId,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    dokumen: p.dokumen.map((d) => ({
      id: d.id,
      namaDokumen: d.namaDokumen,
      fileUrl: d.fileUrl,
      tipeFile: d.tipeFile,
      ukuran: d.ukuran,
    })),
    tracking: p.tracking
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((t) => ({
        id: t.id,
        dariStatus: t.dariStatus,
        keStatus: t.keStatus,
        olehNama: t.olehNama,
        catatan: t.catatan,
        createdAt: t.createdAt.toISOString(),
      })),
    aksi,
  };
}

async function notify(
  userId: string | null | undefined,
  pengajuanId: string,
  judul: string,
  pesan: string
) {
  if (!userId) return;
  await db.notification.create({
    data: { userId, pengajuanId, judul, pesan },
  });
}

async function notifyVerifikatorBidang(bidang: string, pengajuanId: string, judul: string, pesan: string) {
  const verifikators = await db.user.findMany({
    where: { role: "verifikator_bidang", bidang },
    select: { id: true },
  });
  for (const v of verifikators) {
    await notify(v.id, pengajuanId, judul, pesan);
  }
}

async function notifyRole(role: string, pengajuanId: string, judul: string, pesan: string) {
  const users = await db.user.findMany({ where: { role }, select: { id: true } });
  for (const u of users) {
    await notify(u.id, pengajuanId, judul, pesan);
  }
}

/** Hasilkan nomor surat dari template master jenis: mis. 440/{seq}/{kode}/Dinkes-Kukar/{year} atau B-{seq}/DINKES/400.9.13.2/{month}/{year} */
async function generateNomorSurat(jenisId: string, kodeJenis: string, templateNomor: string): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const count = await db.pengajuan.count({
    where: { jenisId, nomorSurat: { not: null } },
  });
  const seq = String(count + 1).padStart(3, "0");
  return templateNomor
    .replaceAll("{seq}", seq)
    .replaceAll("{kode}", kodeJenis)
    .replaceAll("{month}", month)
    .replaceAll("{year}", String(year));
}

export class DemoStore implements Store {
  async listJenis(activeOnly: boolean): Promise<JenisRekomDTO[]> {
    const rows = await db.jenisRekom.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ urutan: "asc" }, { namaJenis: "asc" }],
    });
    return rows.map((j) => ({
      id: j.id,
      kodeJenis: j.kodeJenis,
      namaJenis: j.namaJenis,
      deskripsi: j.deskripsi,
      icon: j.icon,
      warna: j.warna,
      bidang: j.bidang,
      persyaratanJson: j.persyaratanJson,
      templateNomor: j.templateNomor,
      isActive: j.isActive,
      urutan: j.urutan,
      templateSurat: j.templateSurat ?? null,
    }));
  }

  async createJenis(data: JenisInput): Promise<JenisRekomDTO> {
    const j = await db.jenisRekom.create({ data });
    return {
      id: j.id,
      kodeJenis: j.kodeJenis,
      namaJenis: j.namaJenis,
      deskripsi: j.deskripsi,
      icon: j.icon,
      warna: j.warna,
      bidang: j.bidang,
      persyaratanJson: j.persyaratanJson,
      templateNomor: j.templateNomor,
      isActive: j.isActive,
      urutan: j.urutan,
      templateSurat: j.templateSurat ?? null,
    };
  }

  async updateJenis(id: string, data: Partial<JenisInput>): Promise<void> {
    await db.jenisRekom.update({ where: { id }, data });
  }

  async deleteJenis(id: string): Promise<void> {
    const count = await db.pengajuan.count({ where: { jenisId: id } });
    if (count > 0) {
      // arsipkan saja bila sudah ada pengajuan
      await db.jenisRekom.update({ where: { id }, data: { isActive: false } });
      return;
    }
    await db.jenisRekom.delete({ where: { id } });
  }

  private scopeWhere(user: SessionUser) {
    if (user.role === "pemohon") return { pemohonId: user.id };
    if (user.role === "verifikator_bidang") return { jenis: { bidang: user.bidang ?? "" } };
    return {};
  }

  async listPengajuan(user: SessionUser, f: PengajuanFilters): Promise<PengajuanDTO[]> {
    const where = {
      ...this.scopeWhere(user),
      ...(f.jenisId ? { jenisId: f.jenisId } : {}),
      ...(f.status ? { status: f.status } : {}),
      ...(f.q
        ? {
            OR: [
              { judulPengajuan: { contains: f.q } },
              { nomorSurat: { contains: f.q } },
            ],
          }
        : {}),
      ...(f.from || f.to
        ? {
            createdAt: {
              ...(f.from ? { gte: new Date(f.from) } : {}),
              ...(f.to ? { lte: new Date(`${f.to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    } as const;

    const rows = await db.pengajuan.findMany({
      where,
      include: {
        pemohon: {
          select: { id: true, namaLengkap: true, asalInstansi: true, jabatan: true, noHp: true, nik: true },
        },
        jenis: true,
        dokumen: true,
        tracking: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return rows.map((p) => toDTO(p as unknown as PrismaPengajuan, user));
  }

  async getPengajuan(user: SessionUser, id: string): Promise<PengajuanDTO | null> {
    const p = await db.pengajuan.findUnique({
      where: { id },
      include: {
        pemohon: {
          select: { id: true, namaLengkap: true, asalInstansi: true, jabatan: true, noHp: true, nik: true },
        },
        jenis: true,
        dokumen: true,
        tracking: true,
      },
    });
    if (!p) return null;
    const allowed = canRead({
      role: user.role,
      bidang: user.bidang,
      userId: user.id,
      pemohonId: p.pemohonId,
      jenisBidang: p.jenis?.bidang ?? "",
      status: p.status as Status,
    });
    if (!allowed) return null;
    return toDTO(p as unknown as PrismaPengajuan, user);
  }

  async createPengajuan(user: SessionUser, input: CreatePengajuanInput): Promise<string> {
    const jenis = await db.jenisRekom.findUnique({ where: { id: input.jenisId } });
    if (!jenis) throw new Error("Jenis rekomendasi tidak ditemukan");
    const p = await db.pengajuan.create({
      data: {
        pemohonId: user.id,
        jenisId: input.jenisId,
        judulPengajuan: input.judulPengajuan,
        dataFormJson: input.dataFormJson,
        status: "draft",
      },
    });
    await db.trackingStatus.create({
      data: {
        pengajuanId: p.id,
        dariStatus: null,
        keStatus: "draft",
        olehUserId: user.id,
        olehNama: user.namaLengkap,
        catatan: "Pengajuan dibuat",
      },
    });
    return p.id;
  }

  async updateForm(user: SessionUser, id: string, judul: string, dataFormJson: string): Promise<void> {
    const p = await db.pengajuan.findUnique({ where: { id } });
    if (!p || p.pemohonId !== user.id) throw new Error("Tidak berwenang");
    await db.pengajuan.update({
      where: { id },
      data: { judulPengajuan: judul, dataFormJson, updatedAt: new Date() },
    });
  }

  async applyAction(user: SessionUser, id: string, input: ActionInput): Promise<{ ok: boolean; error?: string }> {
    const p = await db.pengajuan.findUnique({
      where: { id },
      include: { jenis: true },
    });
    if (!p || !p.jenis) return { ok: false, error: "Pengajuan tidak ditemukan" };
    const status = p.status as Status;
    const ctx = {
      role: user.role,
      bidang: user.bidang,
      userId: user.id,
      pemohonId: p.pemohonId,
      jenisBidang: p.jenis.bidang,
      status,
    };
    const aksi = computeAksi(ctx);
    if (!aksi.includes(input.action as never)) {
      return { ok: false, error: "Aksi tidak tersedia untuk role/status Anda." };
    }

    const now = new Date();
    const dari = status;
    let ke: Status = status;
    let catatan = input.catatan?.trim() || null;

    switch (input.action) {
      case "submit":
        ke = "diajukan";
        catatan = catatan ?? "Pemohon mengajukan rekomendasi";
        break;
      case "perbaiki":
        ke = "diajukan";
        catatan = catatan ?? "Berkas diperbaiki dan diajukan ulang";
        break;
      case "verifikasi":
        ke = "diverifikasi_bidang";
        catatan = catatan ?? "Berkas diperiksa dan dinyatakan lengkap";
        break;
      case "kembalikan":
        ke = "perlu_perbaikan";
        if (!catatan) return { ok: false, error: "Catatan perbaikan wajib diisi." };
        break;
      case "tolak":
        ke = "ditolak";
        if (!catatan) return { ok: false, error: "Alasan penolakan wajib diisi." };
        break;
      case "setujui":
        ke = "disetujui_kabid";
        catatan = catatan ?? "Disetujui Kabid, diteruskan ke Admin TU";
        break;
      case "beri_nomor":
        ke = "menunggu_ttd_kadis";
        break;
      case "terbitkan":
        // Berkas surat terbit wajib disertakan (unggahan / pilihan dari folder rekom-terbit)
        if (!input.fileTerbit || !input.fileTerbit.trim()) {
          return {
            ok: false,
            error:
              "Pilih atau unggah dulu berkas surat hasil tanda tangan sebelum menerbitkan.",
          };
        }
        ke = "terbit";
        break;
      default:
        return { ok: false, error: "Aksi tidak dikenal" };
    }

    const data: Record<string, unknown> = { status: ke, updatedAt: now };

    if (input.action === "beri_nomor") {
      data.nomorSurat = await generateNomorSurat(p.jenisId, p.jenis.kodeJenis, p.jenis.templateNomor);
    }
    if (input.action === "verifikasi" || input.action === "kembalikan" || input.action === "tolak") {
      data.catatanVerifikator = catatan;
    }
    if (input.action === "terbitkan") {
      data.tglTerbit = now;
      data.qrCodeId = randomUUID();
      // Mode demo: nilai berupa URL /api/files/... dari /api/upload; mode Supabase: path bucket rekom-terbit
      data.fileRekomPdfUrl = input.fileTerbit!.trim();
    }

    await db.pengajuan.update({ where: { id: p.id }, data });

    await db.trackingStatus.create({
      data: {
        pengajuanId: p.id,
        dariStatus: dari,
        keStatus: ke,
        olehUserId: user.id,
        olehNama: user.namaLengkap,
        catatan,
      },
    });

    const judulNotif = `Pengajuan ${kodePengajuan(p.id, p.createdAt)}`;
    const pesanNotif = `${p.judulPengajuan} — status: ${ke.replace(/_/g, " ")}`;

    switch (input.action) {
      case "submit":
        await notifyVerifikatorBidang(p.jenis.bidang, p.id, `Pengajuan baru: ${p.judulPengajuan}`, `Pemohon ${user.namaLengkap} mengajukan ${p.jenis.namaJenis}. Silakan verifikasi berkas.`);
        break;
      case "perbaiki":
        await notifyVerifikatorBidang(p.jenis.bidang, p.id, `Berkas diperbaiki: ${p.judulPengajuan}`, `Pemohon ${user.namaLengkap} telah memperbaiki dan mengajukan ulang berkas.`);
        break;
      case "verifikasi":
        await notify(p.pemohonId, p.id, judulNotif, `Berkas Anda telah diverifikasi bidang ${p.jenis.bidang} dan diteruskan ke Kabid.`);
        await notifyRole("admin_tu", p.id, `Siapkan nomor surat`, `${p.judulPengajuan} telah diverifikasi bidang.`);
        break;
      case "kembalikan":
        await notify(p.pemohonId, p.id, judulNotif, `Berkas dikembalikan untuk perbaikan: ${catatan}`);
        break;
      case "tolak":
        await notify(p.pemohonId, p.id, judulNotif, `Pengajuan ditolak: ${catatan}`);
        break;
      case "setujui":
        await notifyRole("admin_tu", p.id, judulNotif, `Disetujui Kabid. Silakan beri nomor surat.`);
        break;
      case "beri_nomor":
        await notifyRole("kadis", p.id, judulNotif, `Surat telah diberi nomor, menunggu tanda tangan Kepala Dinas.`);
        break;
      case "terbitkan":
        await notify(p.pemohonId, p.id, `Surat terbit: ${p.judulPengajuan}`, `Rekomendasi Anda telah ditandatangani Kepala Dinas dan terbit. Surat resmi dapat dilihat & diunduh di detail pengajuan.`);
        break;
    }

    return { ok: true };
  }

  async addDokumen(user: SessionUser, pengajuanId: string, meta: DokumenMeta): Promise<void> {
    const p = await db.pengajuan.findUnique({ where: { id: pengajuanId } });
    if (!p || p.pemohonId !== user.id) throw new Error("Tidak berwenang");
    await db.dokumenPendukung.create({
      data: {
        pengajuanId,
        namaDokumen: meta.namaDokumen,
        fileUrl: meta.fileUrl,
        tipeFile: meta.tipeFile,
        ukuran: meta.ukuran,
      },
    });
    await db.pengajuan.update({ where: { id: pengajuanId }, data: { updatedAt: new Date() } });
  }

  async removeDokumen(user: SessionUser, dokId: string): Promise<void> {
    const d = await db.dokumenPendukung.findUnique({ where: { id: dokId } });
    if (!d) return;
    const p = await db.pengajuan.findUnique({ where: { id: d.pengajuanId } });
    if (!p || p.pemohonId !== user.id) throw new Error("Tidak berwenang");
    await db.dokumenPendukung.delete({ where: { id: dokId } });
  }

  async getDokumen(dokId: string): Promise<DokumenMeta & { id: string; pengajuanId: string } | null> {
    const d = await db.dokumenPendukung.findUnique({ where: { id: dokId } });
    if (!d) return null;
    return {
      id: d.id,
      pengajuanId: d.pengajuanId,
      namaDokumen: d.namaDokumen,
      fileUrl: d.fileUrl,
      tipeFile: d.tipeFile,
      ukuran: d.ukuran,
    };
  }

  async listNotifications(user: SessionUser): Promise<NotificationDTO[]> {
    const rows = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map((n) => ({
      id: n.id,
      pengajuanId: n.pengajuanId,
      judul: n.judul,
      pesan: n.pesan,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async markNotificationsRead(user: SessionUser, ids?: string[]): Promise<void> {
    await db.notification.updateMany({
      where: { userId: user.id, ...(ids && ids.length ? { id: { in: ids } } : {}) },
      data: { isRead: true },
    });
  }

  async listUsers(): Promise<AdminUserDTO[]> {
    const rows = await db.user.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map((u) => ({
      id: u.id,
      email: u.email,
      namaLengkap: u.namaLengkap,
      nik: u.nik,
      noHp: u.noHp,
      asalInstansi: u.asalInstansi,
      jabatan: u.jabatan,
      role: u.role,
      bidang: u.bidang,
      fotoUrl: u.fotoUrl,
    }));
  }

  async updateUserRole(targetId: string, role: string, bidang: string | null): Promise<void> {
    await db.user.update({
      where: { id: targetId },
      data: { role, bidang: role === "verifikator_bidang" ? bidang : bidang },
    });
  }

  async stats(): Promise<StatsDTO> {
    const now = new Date();
    const awalBulan = new Date(now.getFullYear(), now.getMonth(), 1);
    const [totalPengajuan, diajukan, terbit, perluPerbaikan, terbitBulanIni, totalJenis] =
      await Promise.all([
        db.pengajuan.count(),
        db.pengajuan.count({ where: { status: "diajukan" } }),
        db.pengajuan.count({ where: { status: "terbit" } }),
        db.pengajuan.count({ where: { status: "perlu_perbaikan" } }),
        db.pengajuan.count({ where: { status: "terbit", tglTerbit: { gte: awalBulan } } }),
        db.jenisRekom.count({ where: { isActive: true } }),
      ]);
    return { totalPengajuan, diajukan, terbit, perluPerbaikan, terbitBulanIni, totalJenis };
  }

  async verifySurat(qrCodeId: string): Promise<VerifyDTO | null> {
    const p = await db.pengajuan.findUnique({
      where: { qrCodeId },
      include: {
        jenis: { select: { namaJenis: true } },
        pemohon: { select: { namaLengkap: true, asalInstansi: true } },
      },
    });
    if (!p || p.status !== "terbit") return null;
    const kadis = await db.user.findFirst({ where: { role: "kadis" } });
    return {
      valid: true,
      nomorSurat: p.nomorSurat ?? "-",
      jenisNama: p.jenis?.namaJenis ?? "-",
      judulPengajuan: p.judulPengajuan,
      pemohonNama: p.pemohon?.namaLengkap ?? "-",
      asalInstansi: p.pemohon?.asalInstansi ?? null,
      tglTerbit: iso(p.tglTerbit) ?? "",
      namaKadis: kadis?.namaLengkap ?? "Kepala Dinas Kesehatan",
      pengajuanId: p.id,
      qrCodeId,
    };
  }
  async getPengajuanInternal(id: string): Promise<PengajuanDTO | null> {
    const p = await db.pengajuan.findUnique({
      where: { id },
      include: {
        pemohon: {
          select: { id: true, namaLengkap: true, asalInstansi: true, jabatan: true, noHp: true, nik: true },
        },
        jenis: true,
        dokumen: true,
        tracking: true,
      },
    });
    if (!p) return null;
    const internalUser: SessionUser = {
      id: "__internal__",
      email: "",
      namaLengkap: "",
      role: "super_admin",
      bidang: null,
    };
    return toDTO(p as unknown as PrismaPengajuan, internalUser);
  }

}

