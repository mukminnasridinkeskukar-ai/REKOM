// E-REKOM — Template surat per jenis rekomendasi.
// Tiap jenis rekomendasi bisa punya format surat sendiri (mengikuti template resmi Dinkes),
// disimpan sebagai JSON di kolom master_jenis_rekom.template_surat.
// Placeholder {kunci} diganti otomatis dengan data pengajuan saat PDF dibuat.

export interface BarisIdentitasTpl {
  label: string;
  kunci: string; // nama placeholder tanpa kurung kurawal
}

export interface TemplateSurat {
  judul: string; // judul surat, dicetak tengah + kapital
  lampiran: string; // baris "Lampiran : ..." — kosongkan bila tidak perlu
  pembuka: string; // paragraf pembuka sebelum tabel identitas
  barisIdentitas: BarisIdentitasTpl[]; // baris "Label : nilai" (placeholder didukung)
  penutup: string[]; // paragraf-paragraf setelah tabel identitas
  jabatanTtd: string; // blok jabatan di atas tanda tangan (boleh multi-baris)
  kotaTtd: string; // "Tenggarong" — dicetak sebelum tanggal
}

/** Placeholder tetap yang selalu tersedia (di luar kolom formulir) */
export const KUNCI_TETAP: { kunci: string; label: string }[] = [
  { kunci: "nomor_surat", label: "Nomor surat" },
  { kunci: "tgl_terbit", label: "Tanggal terbit" },
  { kunci: "nama_pemohon", label: "Nama pemohon" },
  { kunci: "nip_nik", label: "NIP / NIK pemohon" },
  { kunci: "instansi", label: "Instansi pemohon" },
  { kunci: "jabatan_pemohon", label: "Jabatan pemohon" },
  { kunci: "no_hp", label: "No. HP pemohon" },
  { kunci: "judul", label: "Judul pengajuan" },
  { kunci: "jenis_rekomendasi", label: "Nama jenis rekomendasi" },
  { kunci: "kode_jenis", label: "Kode jenis" },
  { kunci: "bidang", label: "Bidang" },
  { kunci: "nama_kadis", label: "Nama Kadis (TTD)" },
  { kunci: "nip_kadis", label: "NIP Kadis (TTD)" },
];

export const TEMPLATE_SURAT_DEFAULT: TemplateSurat = {
  judul: "Surat Rekomendasi",
  lampiran: "1 (satu) berkas persyaratan",
  pembuka:
    "Yang bertanda tangan di bawah ini Kepala Dinas Kesehatan Kabupaten Kutai Kartanegara, dengan ini memberikan rekomendasi kepada:",
  barisIdentitas: [
    { label: "Nama", kunci: "nama_pemohon" },
    { label: "NIP / NIK", kunci: "nip_nik" },
    { label: "Instansi", kunci: "instansi" },
  ],
  penutup: [
    "Sebagaimana tercantum dalam pengajuan berjudul \u201c{judul}\u201d dengan jenis rekomendasi {jenis_rekomendasi}. Bersama surat ini, bersangkutan kami rekomendasikan untuk dapat diproses kelengkapan administrasi dan persyaratannya sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.",
    "Demikian surat rekomendasi ini dibuat untuk dipergunakan sebagaimana mestinya.",
  ],
  jabatanTtd: "Kepala Dinas Kesehatan\nKabupaten Kutai Kartanegara,",
  kotaTtd: "Tenggarong",
};

/** Gabungkan hasil parsial dengan default (aman terhadap JSON rusak) */
export function parseTemplateSurat(json: string | null | undefined): TemplateSurat {
  if (!json) return { ...TEMPLATE_SURAT_DEFAULT, barisIdentitas: [...TEMPLATE_SURAT_DEFAULT.barisIdentitas], penutup: [...TEMPLATE_SURAT_DEFAULT.penutup] };
  try {
    const p = JSON.parse(json) as Partial<TemplateSurat>;
    return {
      judul: typeof p.judul === "string" && p.judul.trim() ? p.judul : TEMPLATE_SURAT_DEFAULT.judul,
      lampiran: typeof p.lampiran === "string" ? p.lampiran : TEMPLATE_SURAT_DEFAULT.lampiran,
      pembuka:
        typeof p.pembuka === "string" && p.pembuka.trim()
          ? p.pembuka
          : TEMPLATE_SURAT_DEFAULT.pembuka,
      barisIdentitas: Array.isArray(p.barisIdentitas)
        ? p.barisIdentitas
            .filter((b) => b && typeof b.label === "string" && typeof b.kunci === "string")
            .map((b) => ({ label: b.label, kunci: b.kunci }))
        : [...TEMPLATE_SURAT_DEFAULT.barisIdentitas],
      penutup: Array.isArray(p.penutup)
        ? p.penutup.filter((s) => typeof s === "string" && s.trim())
        : [...TEMPLATE_SURAT_DEFAULT.penutup],
      jabatanTtd: typeof p.jabatanTtd === "string" && p.jabatanTtd.trim() ? p.jabatanTtd : TEMPLATE_SURAT_DEFAULT.jabatanTtd,
      kotaTtd: typeof p.kotaTtd === "string" && p.kotaTtd.trim() ? p.kotaTtd : TEMPLATE_SURAT_DEFAULT.kotaTtd,
    };
  } catch {
    return { ...TEMPLATE_SURAT_DEFAULT, barisIdentitas: [...TEMPLATE_SURAT_DEFAULT.barisIdentitas], penutup: [...TEMPLATE_SURAT_DEFAULT.penutup] };
  }
}

/** Ganti semua {kunci} pada teks; kunci tak dikenal jadi string kosong */
export function isiPlaceholder(teks: string, data: Record<string, string>): string {
  return teks.replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, k: string) => data[k] ?? "");
}

/** Ganti placeholder pada baris identitas; kunci tak dikenal jadi "-" */
export function isiBarisIdentitas(
  baris: BarisIdentitasTpl[],
  data: Record<string, string>
): [string, string][] {
  return baris.map(({ label, kunci }) => [label, data[kunci] || "-"]);
}

/** Isi surat final siap dirender ke PDF (semua placeholder sudah diganti) */
export interface SuratIsiHasil {
  judul: string;
  lampiran: string | null;
  pembuka: string;
  barisIdentitas: [string, string][];
  penutup: string[];
  jabatanTtd: string;
  kotaTtd: string;
}

/** Terjemahkan template + data menjadi isi surat final */
export function renderSuratIsi(tpl: TemplateSurat, data: Record<string, string>): SuratIsiHasil {
  return {
    judul: isiPlaceholder(tpl.judul, data),
    lampiran: tpl.lampiran?.trim() ? isiPlaceholder(tpl.lampiran, data) : null,
    pembuka: isiPlaceholder(tpl.pembuka, data),
    barisIdentitas: isiBarisIdentitas(tpl.barisIdentitas, data),
    penutup: tpl.penutup.map((p) => isiPlaceholder(p, data)),
    jabatanTtd: isiPlaceholder(tpl.jabatanTtd, data),
    kotaTtd: isiPlaceholder(tpl.kotaTtd, data),
  };
}

/** Susun peta data lengkap untuk substitusi placeholder */
export function petaDataSurat(input: {
  nomorSurat: string;
  tglTerbitLabel: string;
  namaPemohon: string;
  nipPemohon?: string;
  instansiPemohon?: string;
  jabatanPemohon?: string;
  noHpPemohon?: string;
  judul: string;
  jenisNama: string;
  kodeJenis: string;
  bidang: string;
  namaKadis: string;
  nipKadis: string;
  dataForm: Record<string, unknown>;
}): Record<string, string> {
  const { dataForm } = input;
  const data: Record<string, string> = {
    nomor_surat: input.nomorSurat,
    tgl_terbit: input.tglTerbitLabel,
    tanggal: input.tglTerbitLabel,
    nama_pemohon: input.namaPemohon,
    nip_nik: input.nipPemohon || "-",
    instansi: input.instansiPemohon || "-",
    jabatan_pemohon: input.jabatanPemohon || "-",
    no_hp: input.noHpPemohon || "-",
    judul: input.judul,
    jenis_rekomendasi: input.jenisNama,
    kode_jenis: input.kodeJenis,
    bidang: input.bidang,
    nama_kadis: input.namaKadis,
    nip_kadis: input.nipKadis,
  };
  for (const [k, v] of Object.entries(dataForm)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string") data[k] = v;
    else if (typeof v === "number" || typeof v === "boolean") data[k] = String(v);
  }
  return data;
}
