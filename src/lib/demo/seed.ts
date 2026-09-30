// E-REKOM — Seed data untuk MODE DEMO.
// Dijalankan otomatis sekali ketika database demo masih kosong.
import { db } from "@/lib/db";
import { createHash, randomUUID } from "crypto";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export const DEMO_PASSWORD = "demo1234";

const JENIS_SEED = [
  {
    kodeJenis: "SIP-DMK",
    namaJenis: "Rekomendasi SIP Dokter / Perawat / Bidan",
    deskripsi:
      "Surat rekomendasi pengajuan Surat Izin Praktik (SIP) tenaga kesehatan di wilayah Kabupaten Kutai Kartanegara.",
    icon: "Stethoscope",
    warna: "#1E3A8A",
    bidang: "SDMK",
    urutan: 1,
    templateNomor: "440/{seq}/SDMK/Dinkes-Kukar/{year}",
    persyaratanJson: JSON.stringify({
      fields: [
        { key: "nama_tenaga_kesehatan", label: "Nama Tenaga Kesehatan", type: "text", required: true },
        { key: "profesi", label: "Profesi", type: "select", required: true, options: ["Dokter Umum", "Dokter Spesialis", "Perawat", "Bidan", "Ahli Gizi", "Apoteker"] },
        { key: "no_str", label: "Nomor STR", type: "text", required: true },
        { key: "masa_berlaku_str", label: "Masa Berlaku STR", type: "date", required: true },
        { key: "tempat_praktik", label: "Tempat Praktik (Fasilitas)", type: "text", required: true },
        { key: "alamat_praktik", label: "Alamat Praktik", type: "textarea", required: true },
      ],
      dokumen: [
        { nama: "Scan KTP", required: true },
        { nama: "Scan STR aktif", required: true },
        { nama: "Scan Ijazah & SIPP", required: true },
        { nama: "Surat rekomendasi organisasi profesi", required: false },
      ],
    }),
  },
  {
    kodeJenis: "IZIN-KLNK",
    namaJenis: "Rekomendasi Izin Klinik Pratama / Utama",
    deskripsi:
      "Rekomendasi pendirian dan pengoperasian klinik pratama maupun klinik utama di Kabupaten Kutai Kartanegara.",
    icon: "Hospital",
    warna: "#0F766E",
    bidang: "Yankes",
    urutan: 2,
    templateNomor: "440/{seq}/YK/Dinkes-Kukar/{year}",
    persyaratanJson: JSON.stringify({
      fields: [
        { key: "nama_klinik", label: "Nama Klinik", type: "text", required: true },
        { key: "kelas_klinik", label: "Kelas Klinik", type: "select", required: true, options: ["Pratama", "Utama"] },
        { key: "alamat_klinik", label: "Alamat Klinik", type: "textarea", required: true },
        { key: "penanggung_jawab", label: "Penanggung Jawab Klinik (Dokter)", type: "text", required: true },
        { key: "no_str_pj", label: "Nomor STR Penanggung Jawab", type: "text", required: true },
        { key: "kapasitas_ranjang", label: "Kapasitas Tempat Tidur", type: "number", required: false },
      ],
      dokumen: [
        { nama: "Scan KTP penanggung jawab", required: true },
        { nama: "Scan STR & SIP dokter PJ", required: true },
        { nama: "Denah bangunan klinik", required: true },
        { nama: "Akta pendirian badan usaha", required: false },
      ],
    }),
  },
  {
    kodeJenis: "IZIN-APT",
    namaJenis: "Rekomendasi Izin Apotek / Toko Obat",
    deskripsi:
      "Rekomendasi perizinan apotek, toko obat, dan depot obat oleh Dinas Kesehatan sebelum izin dari DPMPTSP.",
    icon: "Pill",
    warna: "#7C3AED",
    bidang: "Farmalkes",
    urutan: 3,
    templateNomor: "440/{seq}/FAR/Dinkes-Kukar/{year}",
    persyaratanJson: JSON.stringify({
      fields: [
        { key: "nama_usaha", label: "Nama Apotek / Toko Obat", type: "text", required: true },
        { key: "jenis_usaha", label: "Jenis Usaha", type: "select", required: true, options: ["Apotek", "Toko Obat", "Depot Obat"] },
        { key: "alamat_usaha", label: "Alamat Usaha", type: "textarea", required: true },
        { key: "apoteker_pengelola", label: "Nama Apoteker Pengelola", type: "text", required: true },
        { key: "no_sipa", label: "Nomor SIPA Apoteker", type: "text", required: false },
      ],
      dokumen: [
        { nama: "Scan KTP pemohon", required: true },
        { nama: "Scan Ijazah & SIPA apoteker", required: true },
        { nama: "Foto tampak depan tempat usaha", required: true },
      ],
    }),
  },
  {
    kodeJenis: "SIP-PM",
    namaJenis: "Rekomendasi Izin Praktik Mandiri",
    deskripsi:
      "Surat rekomendasi praktik mandiri tenaga kesehatan (perawat / bidan mandiri) di wilayah kerja Dinkes Kukar.",
    icon: "Home",
    warna: "#DB2777",
    bidang: "SDMK",
    urutan: 4,
    templateNomor: "440/{seq}/SDMK/Dinkes-Kukar/{year}",
    persyaratanJson: JSON.stringify({
      fields: [
        { key: "nama_pemohon", label: "Nama Pemohon", type: "text", required: true },
        { key: "profesi", label: "Profesi", type: "select", required: true, options: ["Perawat", "Bidan"] },
        { key: "no_str", label: "Nomor STR", type: "text", required: true },
        { key: "alamat_praktik", label: "Alamat Praktik Mandiri", type: "textarea", required: true },
      ],
      dokumen: [
        { nama: "Scan KTP", required: true },
        { nama: "Scan STR", required: true },
        { nama: "Scan sertifikat manajemen usaha (bagi bidan)", required: false },
      ],
    }),
  },
  {
    kodeJenis: "PLATARAN",
    namaJenis: "Fasilitasi Pelatihan / SKP Plataran Sehat",
    deskripsi:
      "Rekomendasi fasilitasi kegiatan pelatihan dan pencapaian SKP melalui program Plataran Sehat bagi pegawai dan tenaga kesehatan.",
    icon: "GraduationCap",
    warna: "#D97706",
    bidang: "SDMK",
    urutan: 5,
    templateNomor: "440/{seq}/SDMK/Dinkes-Kukar/{year}",
    persyaratanJson: JSON.stringify({
      fields: [
        { key: "nama_pegawai", label: "Nama Pegawai", type: "text", required: true },
        { key: "nip", label: "NIP", type: "text", required: false },
        { key: "pangkat_golongan", label: "Pangkat / Golongan", type: "text", required: false },
        { key: "unit_kerja", label: "Unit Kerja", type: "text", required: true },
        { key: "nama_pelatihan", label: "Nama Pelatihan / Kegiatan", type: "text", required: true },
        { key: "penyelenggara", label: "Penyelenggara", type: "text", required: false },
        { key: "tgl_pelaksanaan", label: "Tanggal Pelaksanaan", type: "date", required: true },
      ],
      dokumen: [
        { nama: "Surat permohonan pemohon", required: true },
        { nama: "Scan SK pengangkatan / pengangguran pertama", required: false },
        { nama: "Bukti registrasi pelatihan", required: true },
      ],
    }),
  },
  {
    kodeJenis: "STUDI-LANJUT",
    namaJenis: "Rekomendasi Studi Lanjut / Tugas Belajar",
    deskripsi:
      "Rekomendasi pengajuan studi lanjut, tugas belajar, dan izin belajar bagi pegawai Dinas Kesehatan Kukar.",
    icon: "BookOpen",
    warna: "#0284C7",
    bidang: "Sekretariat",
    urutan: 6,
    templateNomor: "440/{seq}/SET/Dinkes-Kukar/{year}",
    persyaratanJson: JSON.stringify({
      fields: [
        { key: "nama_pegawai", label: "Nama Pegawai", type: "text", required: true },
        { key: "nip", label: "NIP", type: "text", required: true },
        { key: "jabatan", label: "Jabatan Sekarang", type: "text", required: true },
        { key: "jenjang_studi", label: "Jenjang Studi", type: "select", required: true, options: ["S2", "S3", "Profesi", "Lainnya"] },
        { key: "perguruan_tinggi", label: "Perguruan Tinggi Tujuan", type: "text", required: true },
        { key: "prodi", label: "Program Studi", type: "text", required: true },
      ],
      dokumen: [
        { nama: "Surat permohonan pribadi", required: true },
        { nama: "Scan SK CPNS / PNS terakhir", required: true },
        { nama: "Surat penerimaan (LoA) perguruan tinggi", required: true },
      ],
    }),
  },
  {
    kodeJenis: "PINDAH-TUGAS",
    namaJenis: "Rekomendasi Pindah Tugas",
    deskripsi:
      "Rekomendasi pengajuan pindah tugas (rotasi / mutasi) pegawai di lingkungan Dinas Kesehatan Kutai Kartanegara.",
    icon: "ArrowLeftRight",
    warna: "#4F46E5",
    bidang: "Sekretariat",
    urutan: 7,
    templateNomor: "440/{seq}/SET/Dinkes-Kukar/{year}",
    persyaratanJson: JSON.stringify({
      fields: [
        { key: "nama_pegawai", label: "Nama Pegawai", type: "text", required: true },
        { key: "nip", label: "NIP", type: "text", required: true },
        { key: "unit_kerja_asal", label: "Unit Kerja Asal", type: "text", required: true },
        { key: "unit_kerja_tujuan", label: "Unit Kerja Tujuan", type: "text", required: true },
        { key: "alasan", label: "Alasan Pindah Tugas", type: "textarea", required: true },
      ],
      dokumen: [
        { nama: "Surat permohonan pribadi", required: true },
        { nama: "Scan SK pengangkatan terakhir", required: true },
        { nama: "Scan SKP 1 tahun terakhir", required: false },
      ],
    }),
  },
  {
    kodeJenis: "LAIN-LAIN",
    namaJenis: "Rekomendasi Lain-lain (Custom)",
    deskripsi:
      "Jenis rekomendasi fleksibel untuk kebutuhan surat rekomendasi lain yang belum terdaftar. Form dapat disesuaikan Super Admin.",
    icon: "ClipboardList",
    warna: "#475569",
    bidang: "Sekretariat",
    urutan: 8,
    templateNomor: "440/{seq}/SET/Dinkes-Kukar/{year}",
    persyaratanJson: JSON.stringify({
      fields: [
        { key: "keperluan", label: "Keperluan Rekomendasi", type: "textarea", required: true },
        { key: "instansi_tujuan", label: "Instansi Tujuan", type: "text", required: false },
      ],
      dokumen: [{ nama: "Surat permohonan pemohon", required: true }],
    }),
  },
];

const USER_SEED = [
  { email: "pemohon@dinkes.go.id", namaLengkap: "Andi Saputra, S.Kep", role: "pemohon", jabatan: "Perawat", asalInstansi: "Puskesmas Tenggarong", nik: "6402010101900001", noHp: "081234567801", bidang: null },
  { email: "bidan@dinkes.go.id", namaLengkap: "Nurhayati, A.Md.Keb", role: "pemohon", jabatan: "Bidan", asalInstansi: "Puskesmas Muara Jawa", nik: "6402010101900002", noHp: "081234567802", bidang: null },
  { email: "verifikator.sdmk@dinkes.go.id", namaLengkap: "dr. Rina Kartika", role: "verifikator_bidang", jabatan: "Kasubag SDMK", asalInstansi: "Dinkes Kukar", nik: "6402010101900003", noHp: "081234567803", bidang: "SDMK" },
  { email: "verifikator.yankes@dinkes.go.id", namaLengkap: "Ir. Hadi Wijaya", role: "verifikator_bidang", jabatan: "Kasubag Yankes", asalInstansi: "Dinkes Kukar", nik: "6402010101900004", noHp: "081234567804", bidang: "Yankes" },
  { email: "verifikator.farmalkes@dinkes.go.id", namaLengkap: "apt. Siti Rahma", role: "verifikator_bidang", jabatan: "Kasubag Farmalkes", asalInstansi: "Dinkes Kukar", nik: "6402010101900005", noHp: "081234567805", bidang: "Farmalkes" },
  { email: "admin.tu@dinkes.go.id", namaLengkap: "Muhammad Fadli", role: "admin_tu", jabatan: "Staff TU Dinkes", asalInstansi: "Dinkes Kukar", nik: "6402010101900006", noHp: "081234567806", bidang: null },
  { email: "kabid@dinkes.go.id", namaLengkap: "dr. Hendra Gunawan, M.Kes", role: "kabid", jabatan: "Kabid Pelayanan Kesehatan", asalInstansi: "Dinkes Kukar", nik: "6402010101900007", noHp: "081234567807", bidang: null },
  { email: "kadis@dinkes.go.id", namaLengkap: "dr. H. Abdul Rahman, M.Kes", role: "kadis", jabatan: "Kepala Dinas Kesehatan", asalInstansi: "Dinkes Kukar", nik: "6402010101900008", noHp: "081234567808", bidang: null },
  { email: "superadmin@dinkes.go.id", namaLengkap: "Rahmat Hidayat", role: "super_admin", jabatan: "Administrator Sistem", asalInstansi: "Dinkes Kukar", nik: "6402010101900009", noHp: "081234567809", bidang: null },
];

let seedPromise: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seed().catch((e) => {
      seedPromise = null;
      throw e;
    });
  }
  return seedPromise;
}

async function seed(): Promise<void> {
  const existing = await db.user.count();
  if (existing > 0) return;

  // ===== users =====
  const users: Record<string, string> = {};
  for (const u of USER_SEED) {
    const row = await db.user.create({
      data: { ...u, passwordHash: sha(DEMO_PASSWORD) },
    });
    users[u.email] = row.id;
  }

  // ===== jenis rekom =====
  const jenisMap: Record<string, string> = {};
  for (const j of JENIS_SEED) {
    const row = await db.jenisRekom.create({ data: j });
    jenisMap[j.kodeJenis] = row.id;
  }

  const hari = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000);

  // ===== contoh pengajuan =====
  const buatPengajuan = async (opts: {
    pemohonEmail: string;
    jenisKode: string;
    judul: string;
    dataForm: Record<string, string>;
    status: string;
    usiaHari: number;
    catatanVerifikator?: string;
    nomorSurat?: string;
    dokumen: string[];
  }) => {
    const p = await db.pengajuan.create({
      data: {
        pemohonId: users[opts.pemohonEmail],
        jenisId: jenisMap[opts.jenisKode],
        judulPengajuan: opts.judul,
        dataFormJson: JSON.stringify(opts.dataForm),
        status: opts.status,
        catatanVerifikator: opts.catatanVerifikator ?? null,
        nomorSurat: opts.nomorSurat ?? null,
        tglTerbit: opts.status === "terbit" ? hari(opts.usiaHari - 1) : null,
        qrCodeId: opts.status === "terbit" ? randomUUID() : null,
        fileRekomPdfUrl: opts.status === "terbit" ? null : null,
        createdAt: hari(opts.usiaHari),
        updatedAt: hari(Math.max(opts.usiaHari - 1, 0)),
      },
    });
    if (opts.status === "terbit") {
      await db.pengajuan.update({
        where: { id: p.id },
        data: { fileRekomPdfUrl: `/api/pengajuan/${p.id}/pdf` },
      });
    }
    const trail: { dari: string | null; ke: string; oleh: string; catatan: string | null; usia: number }[] = [
      { dari: null, ke: "draft", oleh: "Pemohon", catatan: "Pengajuan dibuat", usia: opts.usiaHari },
    ];
    const urutan: string[] = ["draft", "diajukan", "diverifikasi_bidang", "disetujui_kabid", "menunggu_ttd_kadis", "terbit"];
    if (opts.status === "ditolak") {
      trail.push({ dari: "diajukan", ke: "ditolak", oleh: "Verifikator Bidang", catatan: opts.catatanVerifikator ?? "Tidak memenuhi persyaratan", usia: opts.usiaHari - 1 });
    } else if (opts.status === "perlu_perbaikan") {
      trail.push({ dari: "diajukan", ke: "perlu_perbaikan", oleh: "Verifikator Bidang", catatan: opts.catatanVerifikator ?? "Perlu perbaikan", usia: opts.usiaHari - 1 });
    } else {
      const idx = urutan.indexOf(opts.status);
      const oleh: Record<string, string> = {
        diajukan: "Pemohon",
        diverifikasi_bidang: "Verifikator Bidang",
        disetujui_kabid: "Kabid",
        menunggu_ttd_kadis: "Admin TU",
        terbit: "Kepala Dinas",
      };
      for (let i = 1; i <= idx; i++) {
        trail.push({
          dari: urutan[i - 1],
          ke: urutan[i],
          oleh: oleh[urutan[i]],
          catatan: null,
          usia: Math.max(opts.usiaHari - (idx - i), 0),
        });
      }
    }
    for (const t of trail) {
      await db.trackingStatus.create({
        data: {
          pengajuanId: p.id,
          dariStatus: t.dari,
          keStatus: t.ke,
          olehNama: t.oleh,
          catatan: t.catatan,
          createdAt: hari(Math.max(t.usia, 0)),
        },
      });
    }
    for (const d of opts.dokumen) {
      await db.dokumenPendukung.create({
        data: {
          pengajuanId: p.id,
          namaDokumen: d,
          fileUrl: `demo:${d}`,
          tipeFile: "application/pdf",
          ukuran: 512000,
        },
      });
    }
    return p;
  };

  // 1. Terbit — SIP dokter (untuk demo QR verifikasi)
  await buatPengajuan({
    pemohonEmail: "pemohon@dinkes.go.id",
    jenisKode: "SIP-DMK",
    judul: "Rekomendasi SIP Dokter Umum - dr. Andi Saputra",
    dataForm: {
      nama_tenaga_kesehatan: "dr. Andi Saputra",
      profesi: "Dokter Umum",
      no_str: "30.1.1.31.1.24.123456",
      masa_berlaku_str: "2028-06-30",
      tempat_praktik: "Klinik Sehat Sentosa",
      alamat_praktik: "Jl. Gajah Mada No. 45, Tenggarong",
    },
    status: "terbit",
    usiaHari: 12,
    nomorSurat: "440/001/SDMK/Dinkes-Kukar/2026",
    dokumen: ["Scan KTP", "Scan STR aktif", "Scan Ijazah & SIPP"],
  });

  // 2. Diajukan — izin klinik (menunggu verifikasi yankes)
  await buatPengajuan({
    pemohonEmail: "bidan@dinkes.go.id",
    jenisKode: "IZIN-KLNK",
    judul: "Rekomendasi Izin Klinik Pratama Bidan Nurhayati",
    dataForm: {
      nama_klinik: "Klinik Bidan Nurhayati",
      kelas_klinik: "Pratama",
      alamat_klinik: "Jl. Slamet Riyadi No. 12, Muara Jawa",
      penanggung_jawab: "Nurhayati, A.Md.Keb",
      no_str_pj: "1312000123456789",
      kapasitas_ranjang: "4",
    },
    status: "diajukan",
    usiaHari: 3,
    dokumen: ["Scan KTP penanggung jawab", "Scan STR & SIP dokter PJ", "Denah bangunan klinik"],
  });

  // 3. Diverifikasi bidang — apotek (menunggu kabid)
  await buatPengajuan({
    pemohonEmail: "pemohon@dinkes.go.id",
    jenisKode: "IZIN-APT",
    judul: "Rekomendasi Izin Apotek Sehat Farma",
    dataForm: {
      nama_usaha: "Apotek Sehat Farma",
      jenis_usaha: "Apotek",
      alamat_usaha: "Jl. Lambung Mangkurat No. 88, Tenggarong",
      apoteker_pengelola: "apt. Dewi Lestari",
      no_sipa: "SIPA-2024-0987",
    },
    status: "diverifikasi_bidang",
    usiaHari: 7,
    catatanVerifikator: "Berkas lengkap dan sesuai persyaratan.",
    dokumen: ["Scan KTP pemohon", "Scan Ijazah & SIPA apoteker", "Foto tampak depan tempat usaha"],
  });

  // 4. Perlu perbaikan — plataran sehat
  await buatPengajuan({
    pemohonEmail: "bidan@dinkes.go.id",
    jenisKode: "PLATARAN",
    judul: "Fasilitasi Pelatihan Plataran Sehat Batch 3",
    dataForm: {
      nama_pegawai: "Nurhayati, A.Md.Keb",
      nip: "-",
      pangkat_golongan: "Golongan III/a",
      unit_kerja: "Puskesmas Muara Jawa",
      nama_pelatihan: "Plataran Sehat Batch 3",
      penyelenggara: "PPNI Kalimantan Timur",
      tgl_pelaksanaan: "2026-10-20",
    },
    status: "perlu_perbaikan",
    usiaHari: 5,
    catatanVerifikator:
      "Mohon unggah ulang bukti registrasi pelatihan (file tidak terbaca) dan lengkapi nomor SK pengangkatan.",
    dokumen: ["Surat permohonan pemohon", "Bukti registrasi pelatihan"],
  });

  // 5. Menunggu TTD Kadis — studi lanjut
  await buatPengajuan({
    pemohonEmail: "pemohon@dinkes.go.id",
    jenisKode: "STUDI-LANJUT",
    judul: "Rekomendasi Studi Lanjut S2 Kesmas",
    dataForm: {
      nama_pegawai: "Andi Saputra, S.Kep",
      nip: "198701012010011001",
      jabatan: "Perawat Puskesmas",
      jenjang_studi: "S2",
      perguruan_tinggi: "Universitas Mulawarman",
      prodi: "Kesehatan Masyarakat",
    },
    status: "menunggu_ttd_kadis",
    usiaHari: 9,
    nomorSurat: "440/002/SET/Dinkes-Kukar/2026",
    dokumen: ["Surat permohonan pribadi", "Scan SK CPNS / PNS terakhir", "Surat penerimaan (LoA) perguruan tinggi"],
  });

  // 6. Ditolak — pindah tugas
  await buatPengajuan({
    pemohonEmail: "bidan@dinkes.go.id",
    jenisKode: "PINDAH-TUGAS",
    judul: "Rekomendasi Pindah Tugas Puskesmas",
    dataForm: {
      nama_pegawai: "Nurhayati, A.Md.Keb",
      nip: "-",
      unit_kerja_asal: "Puskesmas Muara Jawa",
      unit_kerja_tujuan: "Puskesmas Tenggarong",
      alasan: "Mengikuti suami yang bertugas di Tenggarong",
    },
    status: "ditolak",
    usiaHari: 20,
    catatanVerifikator:
      "Ditolak karena formasi Puskesmas Tenggarong penuh. Silakan ajukan kembali pada tahun anggaran berikutnya.",
    dokumen: ["Surat permohonan pribadi", "Scan SK pengangkatan terakhir"],
  });

  // 7. Draft — SIP praktik mandiri bidan
  await buatPengajuan({
    pemohonEmail: "bidan@dinkes.go.id",
    jenisKode: "SIP-PM",
    judul: "Rekomendasi Izin Praktik Mandiri Bidan (Draft)",
    dataForm: {
      nama_pemohon: "Nurhayati, A.Md.Keb",
      profesi: "Bidan",
      no_str: "1312000123456789",
      alamat_praktik: "Jl. Slamet Riyadi No. 12, Muara Jawa",
    },
    status: "draft",
    usiaHari: 1,
    dokumen: [],
  });

  // 8. Disetujui kabid — lain-lain
  await buatPengajuan({
    pemohonEmail: "pemohon@dinkes.go.id",
    jenisKode: "LAIN-LAIN",
    judul: "Rekomendasi Kepesertaan Bimtek Pelayanan Prima",
    dataForm: {
      keperluan: "Persyaratan pendaftaran bimbingan teknis pelayanan prima tingkat provinsi",
      instansi_tujuan: "Dinas Kesehatan Provinsi Kaltim",
    },
    status: "disetujui_kabid",
    usiaHari: 4,
    catatanVerifikator: "Berkas lengkap, disetujui Kabid untuk penomoran.",
    dokumen: ["Surat permohonan pemohon"],
  });

  // ===== notifikasi contoh =====
  await db.notification.create({
    data: {
      userId: users["pemohon@dinkes.go.id"],
      judul: "Surat rekomendasi Anda telah terbit",
      pesan: "Rekomendasi SIP Dokter Umum telah ditandatangani Kepala Dinas. Silakan unduh PDF.",
    },
  });
  await db.notification.create({
    data: {
      userId: users["verifikator.yankes@dinkes.go.id"],
      judul: "Pengajuan baru menunggu verifikasi",
      pesan: "Klinik Bidan Nurhayati mengajukan rekomendasi izin klinik pratama.",
    },
  });
}
