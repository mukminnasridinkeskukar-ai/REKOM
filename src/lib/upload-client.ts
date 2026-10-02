"use client";

// Helper unggah berkas pendukung untuk komponen klien.
// - Mode Supabase (produksi): unggah LANGSUNG ke Storage bucket "dokumen-rekom"
//   memakai klien browser -> berkas permanen, pratinjau via signed URL.
//   Penataan: {Nama-Pemohon--id8}/{idPengajuan}/{timestamp}-{nama-berkas}
//   sehingga tiap pemohon punya folder sendiri berdasarkan nama.
// - Mode Demo: unggah ke /api/upload (lokal).
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

export interface HasilUnggah {
  /** path storage (mode supabase) atau /api/files/{uuid.ext} (mode demo) */
  fileUrl: string;
  tipeFile: string;
  ukuran: number;
}

/** Nama folder penyimpanan seorang pemohon: "Andi-Saputra-S.Kep--a1b2c3d4". */
export function folderPemohon(nama: string, uid: string): string {
  const bersih =
    (nama || "Pemohon")
      .replace(/[^a-zA-Z0-9 .\-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/^-+|-+$/g, "") || "Pemohon";
  return `${bersih}--${String(uid ?? "").replace(/-/g, "").slice(0, 8)}`;
}

/** Nama berkas yang aman untuk path storage. Dipakai juga oleh dialog terbitkan. */
export function namaAmanBerkas(nama: string): string {
  return (nama || "berkas")
    .replace(/[^\w.\- ]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80) || "berkas";
}

let profilCache: Promise<{ id: string; nama: string } | null> | null = null;

/** Ambil profil pemohon yang sedang login (sekali per sesi halaman).
 *  Dipakai juga oleh file-uploader agar folder penyimpanan konsisten. */
export function profilSaya(): Promise<{ id: string; nama: string } | null> {
  if (!profilCache) {
    profilCache = fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) =>
        j?.user?.id ? { id: String(j.user.id), nama: String(j.user.namaLengkap ?? "") } : null
      )
      .catch(() => null);
  }
  return profilCache;
}

export async function unggahBerkas(file: File, pengajuanId?: string): Promise<HasilUnggah> {
  const tipeFile = file.type || "application/octet-stream";
  const ukuran = file.size;

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (supabase) {
      const me = await profilSaya();
      if (!me) {
        throw new Error(
          "Sesi berakhir — muat ulang halaman (F5) dan masuk kembali sebelum mengunggah dokumen."
        );
      }
      const folder = folderPemohon(me.nama, me.id);
      const sub = pengajuanId ?? "draf";
      const path = `${folder}/${sub}/${Date.now()}-${namaAmanBerkas(file.name)}`;
      const { error } = await supabase.storage.from("dokumen-rekom").upload(path, file, {
        contentType: tipeFile,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      return { fileUrl: path, tipeFile, ukuran };
    }
  }

  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "Gagal mengunggah dokumen");
  return {
    fileUrl: String(json?.data?.fileUrl ?? ""),
    tipeFile: String(json?.data?.tipeFile ?? tipeFile),
    ukuran: Number(json?.data?.ukuran ?? ukuran),
  };
}
