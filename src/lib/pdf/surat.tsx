// E-REKOM — Generator PDF surat resmi (kop surat Dinkes Kukar + TTD Kadis + QR verifikasi)
// Isi surat diambil dari TemplateSurat per jenis rekomendasi (bisa diedit admin);
// placeholder sudah disubstitusi sebelum props masuk ke komponen ini.
// Mendukung dua gaya: klasik (Surat Rekomendasi) & pernyataan/elektronik
// (mis. Surat Pernyataan Pendayagunaan Beasiswa Afirmasi mengikuti template resmi Dinkes).
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { ALAMAT_INSTANSI } from "@/lib/config";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 56,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  kop: {
    flexDirection: "row",
    alignItems: "center",
  },
  emblem: {
    width: 66,
    height: 66,
    marginRight: 14,
  },
  kopCenter: {
    flex: 1,
    alignItems: "center",
  },
  kopLine1: { fontSize: 13, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  kopLine2: { fontSize: 16, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  kopLine3: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  kopAlamat: { fontSize: 8.5, marginTop: 3 },
  garisGanda: { marginTop: 8 },
  garisTebal: { height: 2.2, backgroundColor: "#111827" },
  garisTipis: { height: 0.8, backgroundColor: "#111827", marginTop: 1.4 },
  nomorSurat: { marginTop: 18, lineHeight: 1.6 },
  judulSurat: {
    marginTop: 14,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 12.5,
    textDecoration: "underline",
    textTransform: "uppercase",
  },
  nomorBawah: { marginTop: 5, textAlign: "center" },
  isi: { marginTop: 16, lineHeight: 1.65, textAlign: "justify" },
  tabelIdentitas: { marginTop: 10, marginHorizontal: 22 },
  barisIdentitas: { flexDirection: "row", marginBottom: 3 },
  kolomLabel: { width: 150 },
  kolomTitik: { width: 12 },
  kolomNilai: { flex: 1 },
  penutup: { marginTop: 14 },
  paragraf: { textAlign: "justify", lineHeight: 1.65 },
  itemNomor: { flexDirection: "row", textAlign: "justify", lineHeight: 1.65 },
  itemNomorAngka: { width: 18 },
  itemNomorTeks: { flex: 1 },
  blokTtd: {
    marginTop: 26,
    flexDirection: "row",
  },
  blokTtdElektronik: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  ttdKiri: { flex: 1, justifyContent: "flex-end" },
  ttdKanan: { width: 250, alignItems: "center" },
  ttdTanggal: { marginBottom: 4 },
  ttdPenempatan: { marginBottom: 5 },
  ttdJabatan: { marginBottom: 62, textAlign: "center", lineHeight: 1.5 },
  ttdNama: { fontFamily: "Helvetica-Bold", textDecoration: "underline" },
  ttdNip: { marginTop: 2 },
  ttdBox: {
    width: 260,
    borderWidth: 1.2,
    borderColor: "#111827",
    padding: 8,
  },
  ttdBoxHeader: {
    fontSize: 8.5,
    textDecoration: "underline",
    textAlign: "center",
  },
  ttdBoxIsi: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  ttdBoxTeks: { flex: 1, alignItems: "center" },
  ttdBoxJabatan: { fontSize: 9.5, fontFamily: "Helvetica-Bold", textAlign: "center" },
  ttdBoxNama: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 8, textAlign: "center" },
  ttdBoxPangkat: { fontSize: 9, marginTop: 2, textAlign: "center" },
  qrTtd: { width: 130, alignItems: "center", justifyContent: "center" },
  qrBox: { width: 72, alignItems: "center" },
  qr: { width: 64, height: 64 },
  qrCaption: { fontSize: 6.5, marginTop: 2, textAlign: "center", color: "#374151" },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  footerTengah: {
    position: "absolute",
    bottom: 30,
    left: 56,
    right: 56,
    textAlign: "center",
    fontSize: 8.5,
    color: "#374151",
    lineHeight: 1.4,
  },
  verifText: { marginLeft: 12, fontSize: 8.5, color: "#374151", flex: 1, lineHeight: 1.5 },
});

/** Isi surat yang sudah jadi (placeholder telah diganti data pengajuan) */
export interface SuratIsi {
  judul: string;
  lampiran: string | null; // null/kosong = baris lampiran tidak dicetak
  pembuka: string;
  barisIdentitas: [string, string][];
  penutup: string[];
  jabatanTtd: string;
  kotaTtd: string;
  // V2 — opsional (format pernyataan / gaya elektronik)
  letakNomor?: "atas" | "bawah";
  pembukaKedua?: string | null;
  barisIdentitasKedua?: [string, string][] | null;
  penempatanTtd?: string[] | null;
  gayaTtd?: "klasik" | "elektronik";
  pangkatTtd?: string;
}

export interface SuratProps {
  nomorSurat: string;
  tglTerbitLabel: string;
  verifikasiUrl: string; // URL absolut /verifikasi/{qr}
  qrDataUrl: string;
  namaKadis: string;
  nipKadis: string;
  isi: SuratIsi;
}

function garisIdentitas(label: string, nilai: string, titik = ":") {
  return (
    <View style={styles.barisIdentitas} key={label + nilai}>
      <Text style={styles.kolomLabel}>{label}</Text>
      <Text style={styles.kolomTitik}>{titik}</Text>
      <Text style={styles.kolomNilai}>{nilai}</Text>
    </View>
  );
}

/** Emblem sederhana pemerintah kabupaten (lingkaran + palang hijau) digambar dengan vektor */
function Emblem({ ukuran = 66 }: { ukuran?: number }) {
  return (
    <View
      style={{
        width: ukuran,
        height: ukuran,
        borderRadius: ukuran / 2,
        backgroundColor: "#1E3A8A",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: ukuran * 0.79,
          height: ukuran * 0.79,
          borderRadius: (ukuran * 0.79) / 2,
          backgroundColor: "#0F766E",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: ukuran * 0.45, height: Math.max(3, ukuran * 0.06), backgroundColor: "#FEF3C7", borderRadius: 2 }} />
        <View style={{ width: ukuran * 0.33, height: Math.max(3, ukuran * 0.06), backgroundColor: "#FEF3C7", borderRadius: 2, marginTop: ukuran * 0.045 }} />
        <View style={{ width: ukuran * 0.21, height: Math.max(3, ukuran * 0.06), backgroundColor: "#FBBF24", borderRadius: 2, marginTop: ukuran * 0.045 }} />
      </View>
    </View>
  );
}

/** Paragraf penutup: baris "1. teks" dirata gantung otomatis (daftar ketentuan) */
function ParagrafSurat({ teks, marginTop }: { teks: string; marginTop: number }) {
  const cocok = teks.match(/^(\d{1,2})\.\s+(.*)$/);
  if (cocok) {
    return (
      <View style={[styles.itemNomor, marginTop ? { marginTop } : undefined]}>
        <Text style={styles.itemNomorAngka}>{cocok[1]}.</Text>
        <Text style={styles.itemNomorTeks}>{cocok[2]}</Text>
      </View>
    );
  }
  return <Text style={[styles.paragraf, marginTop ? { marginTop } : undefined]}>{teks}</Text>;
}

export function SuratRekomDocument(props: SuratProps) {
  const { nomorSurat, tglTerbitLabel, verifikasiUrl, qrDataUrl, namaKadis, nipKadis, isi } = props;
  const gayaElektronik = isi.gayaTtd === "elektronik";
  const judulDulu = isi.letakNomor === "bawah";

  return (
    <Document title={`Surat ${isi.judul} ${nomorSurat}`} author="Dinas Kesehatan Kabupaten Kutai Kartanegara">
      <Page size="A4" style={styles.page}>
        {/* ===== KOP SURAT ===== */}
        <View style={styles.kop} fixed>
          <View style={styles.emblem}>
            <Emblem />
          </View>
          <View style={styles.kopCenter}>
            <Text style={styles.kopLine1}>PEMERINTAH KABUPATEN KUTAI KARTANEGARA</Text>
            <Text style={styles.kopLine2}>DINAS KESEHATAN</Text>
            <Text style={styles.kopLine3}>Komplek Perkantoran Pemkab Kukar, Tenggarong</Text>
            <Text style={styles.kopAlamat}>{ALAMAT_INSTANSI}</Text>
          </View>
          <View style={{ width: 66 }} />
        </View>
        <View style={styles.garisGanda} fixed>
          <View style={styles.garisTebal} />
          <View style={styles.garisTipis} />
        </View>

        {/* ===== NOMOR & JUDUL ===== */}
        {judulDulu ? (
          <>
            <Text style={[styles.judulSurat, { marginTop: 18 }]}>{isi.judul}</Text>
            <Text style={styles.nomorBawah}>Nomor: {nomorSurat}</Text>
            {isi.lampiran && isi.lampiran.trim() ? (
              <Text style={[styles.nomorBawah, { textAlign: "left" }]}>Lampiran : {isi.lampiran}</Text>
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.nomorSurat}>
              <Text>Nomor : {nomorSurat}</Text>
              {isi.lampiran && isi.lampiran.trim() ? <Text>Lampiran : {isi.lampiran}</Text> : null}
            </View>
            <Text style={styles.judulSurat}>{isi.judul}</Text>
          </>
        )}

        {/* ===== ISI SURAT ===== */}
        <View style={styles.isi}>
          <Text>{isi.pembuka}</Text>
        </View>

        <View style={styles.tabelIdentitas}>
          {isi.barisIdentitas.map(([label, nilai]) => garisIdentitas(label, nilai))}
        </View>

        {/* Blok identitas kedua (mis. pemohon pada surat pernyataan) */}
        {isi.pembukaKedua ? (
          <View style={[styles.isi, { marginTop: 14 }]}>
            <Text>{isi.pembukaKedua}</Text>
          </View>
        ) : null}
        {isi.pembukaKedua && isi.barisIdentitasKedua?.length ? (
          <View style={styles.tabelIdentitas}>
            {isi.barisIdentitasKedua.map(([label, nilai]) => garisIdentitas(label, nilai))}
          </View>
        ) : null}

        <View style={styles.penutup}>
          {isi.penutup.map((paragraf, i) => (
            <ParagrafSurat key={i} teks={paragraf} marginTop={i > 0 ? 10 : 0} />
          ))}
        </View>

        {/* ===== TANDA TANGAN ===== */}
        {gayaElektronik ? (
          <>
            {/* baris penempatan ("Ditetapkan di / Pada tanggal") — mengganti "Kota, tanggal" */}
            <View style={styles.blokTtd}>
              <View style={{ flex: 1 }} />
              <View style={{ width: 260 }}>
                {(isi.penempatanTtd?.length
                  ? isi.penempatanTtd
                  : [`${isi.kotaTtd}, ${tglTerbitLabel}`]
                ).map((baris, i) => (
                  <Text key={i} style={styles.ttdPenempatan}>
                    {baris}
                  </Text>
                ))}
              </View>
            </View>
            {/* QR di kiri + kotak tanda tangan elektronik di kanan */}
            <View style={styles.blokTtdElektronik}>
              <View style={styles.qrTtd}>
                <Image style={styles.qr} src={qrDataUrl} alt="QR Verifikasi" />
                <Text style={styles.qrCaption}>Scan QR / buka {verifikasiUrl}</Text>
              </View>
              <View style={{ flex: 1 }} />
              <View style={styles.ttdBox}>
                <Text style={styles.ttdBoxHeader}>Ditandatangani Secara Elektronik Oleh:</Text>
                <View style={styles.ttdBoxIsi}>
                  <View style={{ width: 44, marginRight: 6 }}>
                    <Emblem ukuran={44} />
                  </View>
                  <View style={styles.ttdBoxTeks}>
                    <Text style={styles.ttdBoxJabatan}>{isi.jabatanTtd}</Text>
                    <Text style={styles.ttdBoxNama}>{namaKadis}</Text>
                    {isi.pangkatTtd ? <Text style={styles.ttdBoxPangkat}>{isi.pangkatTtd}</Text> : null}
                  </View>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.blokTtd}>
            <View style={styles.ttdKiri} />
            <View style={styles.ttdKanan}>
              {isi.penempatanTtd?.length ? (
                isi.penempatanTtd.map((baris, i) => (
                  <Text key={i} style={styles.ttdPenempatan}>
                    {baris}
                  </Text>
                ))
              ) : (
                <Text style={styles.ttdTanggal}>
                  {isi.kotaTtd}, {tglTerbitLabel}
                </Text>
              )}
              <Text style={styles.ttdJabatan}>{isi.jabatanTtd}</Text>
              <Text style={styles.ttdNama}>{namaKadis}</Text>
              <Text style={styles.ttdNip}>{nipKadis}</Text>
            </View>
          </View>
        )}

        {/* ===== FOOTER ===== */}
        {gayaElektronik ? (
          <Text style={styles.footerTengah} fixed>
            Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh
            Balai Besar Sertifikasi Elektronik (BSrE), Badan Siber dan Sandi Negara (BSSN).
          </Text>
        ) : (
          <View style={styles.footer} fixed>
            <View style={styles.qrBox}>
              <Image style={styles.qr} src={qrDataUrl} alt="QR Verifikasi" />
              <Text style={styles.qrCaption}>Scan QR / buka URL</Text>
            </View>
            <Text style={styles.verifText}>
              Verifikasi keaslian surat ini di {verifikasiUrl} menggunakan kode QR di samping. Surat diterbitkan
              secara elektronik melalui sistem E-REKOM Dinas Kesehatan Kabupaten Kutai Kartanegara.
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
