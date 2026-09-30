// E-REKOM — Store implementasi untuk PRODUKSI (Supabase Postgres + RLS).
// Dipakai ketika NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY terisi.
// Semua query memakai klien terautentikasi milik user -> kebijakan RLS di supabase.sql berlaku.
import { createServerSupabase } from "@/lib/supabase/server";
import type {
  Store,
  PengajuanFilters,
  JenisInput,
  CreatePengajuanInput,
  DokumenMeta,
  ActionInput,
  AdminUserDTO,
  StatsDTO,
  VerifyDTO,
} from "@/lib/store";
import type { SessionUser } from "@/lib/session";
import type { JenisRekomDTO, NotificationDTO, PengajuanDTO, Status } from "@/lib/types";
import { computeAksi, canRead } from "@/lib/permissions";
import { randomUUID } from "crypto";

interface RowPengajuan {
  id: string;
  pemohon_id: string;
  judul_pengajuan: string;
  data_form_jsonb: unknown;
  status: string;
  catatan_verifikator: string | null;
  nomor_surat: string | null;
  tgl_terbit: string | null;
  file_rekom_pdf_url: string | null;
  qr_code_id: string | null;
  created_at: string;
  updated_at: string;
  master_jenis_rekom: RowJenis[] | RowJenis | null;
  profiles: RowProfile[] | RowProfile | null;
  dokumen_pendukung: RowDokumen[] | null;
  tracking_status: RowTracking[] | null;
}

interface RowJenis {
  id: string;
  kode_jenis: string;
  nama_jenis: string;
  deskripsi: string | null;
  icon: string;
  warna: string;
  bidang: string;
  persyaratan_json: unknown;
  template_nomor: string;
  is_active: boolean;
  urutan: number;
}

interface RowProfile {
  id: string;
  nama_lengkap: string;
  asal_instansi: string | null;
  jabatan: string | null;
  no_hp: string | null;
  nik: string | null;
}

interface RowDokumen {
  id: string;
  nama_dokumen: string;
  file_url: string;
  tipe_file: string;
  ukuran: number;
}

interface RowTracking {
  id: string;
  dari_status: string | null;
  ke_status: string;
  oleh_user_id: string | null;
  catatan: string | null;
  created_at: string;
  profiles: { nama_lengkap: string } | null;
}

function kodePengajuan(id: string, createdAt: string | Date): string {
  const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const suffix = id.replace(/[^a-zA-Z0-9]/g, "").slice(-5).toUpperCase();
  return `RK-${d.getFullYear()}-${suffix}`;
}

function toJenisDTO(j: RowJenis): JenisRekomDTO {
  return {
    id: j.id,
    kodeJenis: j.kode_jenis,
    namaJenis: j.nama_jenis,
    deskripsi: j.deskripsi,
    icon: j.icon,
    warna: j.warna,
    bidang: j.bidang,
    persyaratanJson: typeof j.persyaratan_json === "string" ? j.persyaratan_json : JSON.stringify(j.persyaratan_json ?? {}),
    templateNomor: j.template_nomor,
    isActive: j.is_active,
    urutan: j.urutan,
  };
}

function toDTO(p: RowPengajuan, user: SessionUser): PengajuanDTO {
  const jenisRow = Array.isArray(p.master_jenis_rekom) ? p.master_jenis_rekom[0] : p.master_jenis_rekom;
  const pemohonRow = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
  const jenis = jenisRow ? toJenisDTO(jenisRow) : null;
  const status = p.status as Status;
  const ctx = {
    role: user.role,
    bidang: user.bidang,
    userId: user.id,
    pemohonId: p.pemohon_id,
    jenisBidang: jenis?.bidang ?? "",
    status,
  };
  return {
    id: p.id,
    kode: kodePengajuan(p.id, p.created_at),
    jenis,
    pemohon: pemohonRow
      ? {
          id: pemohonRow.id,
          namaLengkap: pemohonRow.nama_lengkap,
          asalInstansi: pemohonRow.asal_instansi,
          jabatan: pemohonRow.jabatan,
          noHp: pemohonRow.no_hp,
          nik: pemohonRow.nik,
          fotoUrl: (pemohonRow as any).foto_url ?? null,
        }
      : null,
    judulPengajuan: p.judul_pengajuan,
    dataFormJson: typeof p.data_form_jsonb === "string" ? p.data_form_jsonb : JSON.stringify(p.data_form_jsonb ?? {}),
    status,
    catatanVerifikator: p.catatan_verifikator,
    nomorSurat: p.nomor_surat,
    tglTerbit: p.tgl_terbit,
    fileRekomPdfUrl: p.file_rekom_pdf_url,
    qrCodeId: p.qr_code_id,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    dokumen: (p.dokumen_pendukung ?? []).map((d) => ({
      id: d.id,
      namaDokumen: d.nama_dokumen,
      fileUrl: d.file_url,
      tipeFile: d.tipe_file,
      ukuran: d.ukuran,
    })),
    tracking: (p.tracking_status ?? [])
      .slice()
      .sort((a, b) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")))
      .map((t) => ({
        id: t.id,
        dariStatus: t.dari_status,
        keStatus: t.ke_status,
        olehNama: t.profiles?.nama_lengkap ?? null,
        catatan: t.catatan,
        createdAt: t.created_at,
      })),
    aksi: canRead(ctx) ? computeAksi(ctx) : [],
  };
}

async function mustClient() {
  const supabase = await createServerSupabase();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi");
  return supabase;
}

export class SupabaseStore implements Store {
  async listJenis(activeOnly: boolean): Promise<JenisRekomDTO[]> {
    const supabase = await mustClient();
    let query = supabase.from("master_jenis_rekom").select("*").order("urutan", { ascending: true });
    if (activeOnly) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data as RowJenis[]).map(toJenisDTO);
  }

  async createJenis(data: JenisInput): Promise<JenisRekomDTO> {
    const supabase = await mustClient();
    const { data: row, error } = await supabase
      .from("master_jenis_rekom")
      .insert({
        kode_jenis: data.kodeJenis,
        nama_jenis: data.namaJenis,
        deskripsi: data.deskripsi ?? null,
        icon: data.icon,
        warna: data.warna,
        bidang: data.bidang,
        persyaratan_json: JSON.parse(data.persyaratanJson || "{}"),
        template_nomor: data.templateNomor,
        is_active: data.isActive,
        urutan: data.urutan,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toJenisDTO(row as RowJenis);
  }

  async updateJenis(id: string, data: Partial<JenisInput>): Promise<void> {
    const supabase = await mustClient();
    const payload: Record<string, unknown> = {};
    if (data.kodeJenis !== undefined) payload.kode_jenis = data.kodeJenis;
    if (data.namaJenis !== undefined) payload.nama_jenis = data.namaJenis;
    if (data.deskripsi !== undefined) payload.deskripsi = data.deskripsi;
    if (data.icon !== undefined) payload.icon = data.icon;
    if (data.warna !== undefined) payload.warna = data.warna;
    if (data.bidang !== undefined) payload.bidang = data.bidang;
    if (data.persyaratanJson !== undefined) payload.persyaratan_json = JSON.parse(data.persyaratanJson || "{}");
    if (data.templateNomor !== undefined) payload.template_nomor = data.templateNomor;
    if (data.isActive !== undefined) payload.is_active = data.isActive;
    if (data.urutan !== undefined) payload.urutan = data.urutan;
    const { error } = await supabase.from("master_jenis_rekom").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  }

  async deleteJenis(id: string): Promise<void> {
    const supabase = await mustClient();
    const { count } = await supabase
      .from("pengajuan_rekom")
      .select("id", { count: "exact", head: true })
      .eq("jenis_id", id);
    if ((count ?? 0) > 0) {
      await supabase.from("master_jenis_rekom").update({ is_active: false }).eq("id", id);
      return;
    }
    const { error } = await supabase.from("master_jenis_rekom").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  private selectDetail() {
    return `*, master_jenis_rekom(*), profiles(*), dokumen_pendukung(*), tracking_status(id, created_at, dari_status, ke_status, catatan, profiles(nama_lengkap))`;
  }

  async listPengajuan(user: SessionUser, f: PengajuanFilters): Promise<PengajuanDTO[]> {
    const supabase = await mustClient();
    let query = supabase
      .from("pengajuan_rekom")
      .select(this.selectDetail())
      .order("updated_at", { ascending: false })
      .limit(200);
    if (user.role === "pemohon") query = query.eq("pemohon_id", user.id);
    if (f.jenisId) query = query.eq("jenis_id", f.jenisId);
    if (f.status) query = query.eq("status", f.status);
    if (f.q) query = query.or(`judul_pengajuan.ilike.%${f.q}%,nomor_surat.ilike.%${f.q}%`);
    if (f.from) query = query.gte("created_at", f.from);
    if (f.to) query = query.lte("created_at", `${f.to}T23:59:59.999Z`);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data as unknown as RowPengajuan[]).map((p) => toDTO(p, user));
  }

  async getPengajuan(user: SessionUser, id: string): Promise<PengajuanDTO | null> {
    const supabase = await mustClient();
    const { data, error } = await supabase
      .from("pengajuan_rekom")
      .select(this.selectDetail())
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const p = data as unknown as RowPengajuan;
    const jenisRow = Array.isArray(p.master_jenis_rekom) ? p.master_jenis_rekom[0] : p.master_jenis_rekom;
    const ctx = {
      role: user.role,
      bidang: user.bidang,
      userId: user.id,
      pemohonId: p.pemohon_id,
      jenisBidang: jenisRow?.bidang ?? "",
      status: p.status as Status,
    };
    if (!canRead(ctx)) return null;
    return toDTO(p, user);
  }

  async createPengajuan(user: SessionUser, input: CreatePengajuanInput): Promise<string> {
    const supabase = await mustClient();
    const { data, error } = await supabase
      .from("pengajuan_rekom")
      .insert({
        pemohon_id: user.id,
        jenis_id: input.jenisId,
        judul_pengajuan: input.judulPengajuan,
        data_form_jsonb: JSON.parse(input.dataFormJson || "{}"),
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const id = (data as { id: string }).id;
    await supabase.from("tracking_status").insert({
      pengajuan_id: id,
      dari_status: null,
      ke_status: "draft",
      oleh_user_id: user.id,
      catatan: "Pengajuan dibuat",
    });
    return id;
  }

  async updateForm(user: SessionUser, id: string, judul: string, dataFormJson: string): Promise<void> {
    const supabase = await mustClient();
    const { error } = await supabase
      .from("pengajuan_rekom")
      .update({ judul_pengajuan: judul, data_form_jsonb: JSON.parse(dataFormJson || "{}") })
      .eq("id", id)
      .eq("pemohon_id", user.id);
    if (error) throw new Error(error.message);
  }

  async applyAction(user: SessionUser, id: string, input: ActionInput): Promise<{ ok: boolean; error?: string }> {
    const supabase = await mustClient();
    const current = await this.getPengajuan(user, id);
    if (!current) return { ok: false, error: "Pengajuan tidak ditemukan / tidak berwenang" };
    const aksi = computeAksi({
      role: user.role,
      bidang: user.bidang,
      userId: user.id,
      pemohonId: current.pemohon?.id ?? "",
      jenisBidang: current.jenis?.bidang ?? "",
      status: current.status,
    });
    if (!aksi.includes(input.action as never)) {
      return { ok: false, error: "Aksi tidak tersedia untuk role/status Anda." };
    }

    const dari = current.status;
    let ke: Status = dari;
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
        ke = "terbit";
        break;
      default:
        return { ok: false, error: "Aksi tidak dikenal" };
    }

    const payload: Record<string, unknown> = { status: ke };
    if (input.action === "beri_nomor") {
      const { data: nomor, error: rpcErr } = await supabase.rpc("generate_nomor_surat", {
        p_jenis_id: current.jenis?.id,
      });
      if (rpcErr || !nomor) {
        // fallback lokal bila RPC gagal
        const year = new Date().getFullYear();
        payload.nomor_surat = `440/${String(Date.now() % 1000).padStart(3, "0")}/${current.jenis?.kodeJenis ?? "REK"}/Dinkes-Kukar/${year}`;
      } else {
        payload.nomor_surat = nomor;
      }
    }
    if (input.action === "verifikasi" || input.action === "kembalikan" || input.action === "tolak") {
      payload.catatan_verifikator = catatan;
    }
    if (input.action === "terbitkan") {
      payload.tgl_terbit = new Date().toISOString();
      payload.qr_code_id = randomUUID();
      payload.file_rekom_pdf_url = `/api/pengajuan/${id}/pdf`;
    }

    const { error: upErr } = await supabase.from("pengajuan_rekom").update(payload).eq("id", id);
    if (upErr) return { ok: false, error: upErr.message };

    await supabase.from("tracking_status").insert({
      pengajuan_id: id,
      dari_status: dari,
      ke_status: ke,
      oleh_user_id: user.id,
      catatan,
    });

    const judulNotif = `Pengajuan ${current.kode}`;
    const insertNotif = async (userId: string, judul: string, pesan: string) => {
      await supabase.from("notifications").insert({ user_id: userId, pengajuan_id: id, judul, pesan });
    };
    const notifyRole = async (role: string, judul: string, pesan: string) => {
      const { data: rows } = await supabase.from("profiles").select("id").eq("role", role);
      for (const r of (rows ?? []) as { id: string }[]) await insertNotif(r.id, judul, pesan);
    };

    const notifyVerifikatorBidang = async (bidang: string, judul: string, pesan: string) => {
      const { data: rows } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "verifikator_bidang")
        .eq("bidang", bidang);
      for (const r of (rows ?? []) as { id: string }[]) await insertNotif(r.id, judul, pesan);
    };

    switch (input.action) {
      case "submit":
        await notifyVerifikatorBidang(current.jenis?.bidang ?? "", `Pengajuan baru: ${current.judulPengajuan}`, `Pemohon ${user.namaLengkap} mengajukan ${current.jenis?.namaJenis ?? "rekomendasi"}. Silakan verifikasi berkas.`);
        break;
      case "perbaiki":
        await notifyRole("verifikator_bidang", `Berkas diperbaiki: ${current.judulPengajuan}`, `Pemohon ${user.namaLengkap} telah memperbaiki dan mengajukan ulang berkas.`);
        break;
      case "verifikasi":
        if (current.pemohon) await insertNotif(current.pemohon.id, judulNotif, `Berkas Anda telah diverifikasi bidang dan diteruskan ke Kabid.`);
        await notifyRole("admin_tu", `Siapkan nomor surat`, `${current.judulPengajuan} telah diverifikasi bidang.`);
        break;
      case "kembalikan":
        if (current.pemohon) await insertNotif(current.pemohon.id, judulNotif, `Berkas dikembalikan untuk perbaikan: ${catatan}`);
        break;
      case "tolak":
        if (current.pemohon) await insertNotif(current.pemohon.id, judulNotif, `Pengajuan ditolak: ${catatan}`);
        break;
      case "setujui":
        await notifyRole("admin_tu", judulNotif, `Disetujui Kabid. Silakan beri nomor surat.`);
        break;
      case "beri_nomor":
        await notifyRole("kadis", judulNotif, `Surat telah diberi nomor, menunggu tanda tangan Kepala Dinas.`);
        break;
      case "terbitkan":
        if (current.pemohon) await insertNotif(current.pemohon.id, `Surat terbit: ${current.judulPengajuan}`, `Rekomendasi Anda telah ditandatangani Kepala Dinas dan terbit.`);
        break;
    }

    return { ok: true };
  }

  async addDokumen(user: SessionUser, pengajuanId: string, meta: DokumenMeta): Promise<void> {
    const supabase = await mustClient();
    const { error } = await supabase.from("dokumen_pendukung").insert({
      pengajuan_id: pengajuanId,
      nama_dokumen: meta.namaDokumen,
      file_url: meta.fileUrl,
      tipe_file: meta.tipeFile,
      ukuran: meta.ukuran,
    });
    if (error) throw new Error(error.message);
    await supabase.from("pengajuan_rekom").update({ updated_at: new Date().toISOString() }).eq("id", pengajuanId).eq("pemohon_id", user.id);
  }

  async removeDokumen(user: SessionUser, dokId: string): Promise<void> {
    const supabase = await mustClient();
    const { data: doc } = await supabase
      .from("dokumen_pendukung")
      .select("id, file_url, pengajuan_id!inner")
      .eq("id", dokId)
      .maybeSingle();
    const row = doc as unknown as { id: string; file_url: string; pengajuan_id: string } | null;
    if (row) {
      await supabase.storage.from("dokumen-rekom").remove([row.file_url]);
    }
    const { error } = await supabase.from("dokumen_pendukung").delete().eq("id", dokId);
    if (error) throw new Error(error.message);
  }

  async getDokumen(dokId: string): Promise<DokumenMeta & { id: string; pengajuanId: string } | null> {
    const supabase = await mustClient();
    const { data } = await supabase
      .from("dokumen_pendukung")
      .select("*")
      .eq("id", dokId)
      .maybeSingle();
    if (!data) return null;
    const d = data as unknown as RowDokumen & { pengajuan_id: string };
    return {
      id: d.id,
      pengajuanId: d.pengajuan_id,
      namaDokumen: d.nama_dokumen,
      fileUrl: d.file_url,
      tipeFile: d.tipe_file,
      ukuran: d.ukuran,
    };
  }

  async listNotifications(user: SessionUser): Promise<NotificationDTO[]> {
    const supabase = await mustClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).map((n) => ({
      id: n.id,
      pengajuanId: n.pengajuan_id,
      judul: n.judul,
      pesan: n.pesan,
      isRead: n.is_read,
      createdAt: n.created_at,
    }));
  }

  async markNotificationsRead(user: SessionUser, ids?: string[]): Promise<void> {
    const supabase = await mustClient();
    let query = supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id);
    if (ids && ids.length) query = query.in("id", ids);
    const { error } = await query;
    if (error) throw new Error(error.message);
  }

  async listUsers(): Promise<AdminUserDTO[]> {
    const supabase = await mustClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      namaLengkap: u.nama_lengkap,
      nik: u.nik,
      noHp: u.no_hp,
      asalInstansi: u.asal_instansi,
      jabatan: u.jabatan,
      role: u.role,
      bidang: u.bidang,
      fotoUrl: u.foto_url,
    }));
  }

  async updateUserRole(targetId: string, role: string, bidang: string | null): Promise<void> {
    const supabase = await mustClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role, bidang })
      .eq("id", targetId);
    if (error) throw new Error(error.message);
  }

  async stats(): Promise<StatsDTO> {
    const supabase = await mustClient();
    const countBy = async (col?: string, val?: string) => {
      let q = supabase.from("pengajuan_rekom").select("id", { count: "exact", head: true });
      if (col && val) q = q.eq(col, val);
      const { count } = await q;
      return count ?? 0;
    };
    const awalBulan = new Date();
    awalBulan.setDate(1);
    awalBulan.setHours(0, 0, 0, 0);
    const [totalPengajuan, diajukan, terbit, perluPerbaikan, terbitBulanIni, jenisCount] = await Promise.all([
      countBy(),
      countBy("status", "diajukan"),
      countBy("status", "terbit"),
      countBy("status", "perlu_perbaikan"),
      (async () => {
        const { count } = await supabase
          .from("pengajuan_rekom")
          .select("id", { count: "exact", head: true })
          .eq("status", "terbit")
          .gte("tgl_terbit", awalBulan.toISOString());
        return count ?? 0;
      })(),
      (async () => {
        const { count } = await supabase
          .from("master_jenis_rekom")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true);
        return count ?? 0;
      })(),
    ]);
    return { totalPengajuan, diajukan, terbit, perluPerbaikan, terbitBulanIni, totalJenis: jenisCount };
  }

  async verifySurat(qrCodeId: string): Promise<VerifyDTO | null> {
    const supabase = await mustClient();
    // RPC security-definer agar publik tanpa login dapat memverifikasi
    const { data, error } = await supabase.rpc("verify_surat_public", { p_qr: qrCodeId });
    if (error || !data) return null;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      valid: true,
      nomorSurat: row.nomor_surat,
      jenisNama: row.jenis_nama,
      judulPengajuan: row.judul_pengajuan,
      pemohonNama: row.pemohon_nama,
      asalInstansi: row.asal_instansi,
      tglTerbit: row.tgl_terbit,
      namaKadis: row.nama_kadis,
      pengajuanId: row.pengajuan_id,
      qrCodeId,
    };
  }
  async getPengajuanInternal(id: string): Promise<PengajuanDTO | null> {
    // Untuk render PDF publik butuh akses internal -> coba service role bila tersedia,
    // selain itu gunakan klien user (mengikuti RLS).
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import("@/lib/config");
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { createServerClient } = await import("@supabase/ssr");
    const client = serviceKey
      ? createServerClient(SUPABASE_URL, serviceKey, { cookies: { getAll: () => [], setAll: () => undefined } })
      : await mustClient();
    const { data, error } = await client
      .from("pengajuan_rekom")
      .select(this.selectDetail())
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    const internalUser: SessionUser = {
      id: "__internal__",
      email: "",
      namaLengkap: "",
      role: "super_admin",
      bidang: null,
    };
    return toDTO(data as unknown as RowPengajuan, internalUser);
  }

}
