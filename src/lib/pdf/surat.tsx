// E-REKOM — Generator PDF surat rekomendasi resmi (kop surat Dinkes Kukar + TTD Kadis + QR verifikasi)
// Isi surat diambil dari TemplateSurat per jenis rekomendasi (bisa diedit admin);
// placeholder sudah disubstitusi sebelum props masuk ke komponen ini.
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
  isi: { marginTop: 16, lineHeight: 1.65, textAlign: "justify" },
  tabelIdentitas: { marginTop: 10, marginHorizontal: 22 },
  barisIdentitas: { flexDirection: "row", marginBottom: 3 },
  kolomLabel: { width: 150 },
  kolomTitik: { width: 12 },
  kolomNilai: { flex: 1 },
  penutup: { marginTop: 14 },
  blokTtd: {
    marginTop: 26,
    flexDirection: "row",
  },
  ttdKiri: { flex: 1, justifyContent: "flex-end" },
  ttdKanan: { width: 250, alignItems: "center" },
  ttdTanggal: { marginBottom: 4 },
  ttdJabatan: { marginBottom: 62, textAlign: "center", lineHeight: 1.5 },
  ttdNama: { fontFamily: "Helvetica-Bold", textDecoration: "underline" },
  ttdNip: { marginTop: 2 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  qrBox: { width: 72, alignItems: "center" },
  qr: { width: 64, height: 64 },
  qrCaption: { fontSize: 6.5, marginTop: 2, textAlign: "center", color: "#374151" },
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
    <View style={styles.barisIdentitas} key={label}>
      <Text style={styles.kolomLabel}>{label}</Text>
      <Text style={styles.kolomTitik}>{titik}</Text>
      <Text style={styles.kolomNilai}>{nilai}</Text>
    </View>
  );
}

/** Emblem sederhana pemerintah kabupaten (lingkaran + palang hijau) digambar dengan vektor */
function Emblem() {
  return (
    <View style={styles.emblem}>
      <View
        style={{
          width: 66,
          height: 66,
          borderRadius: 33,
          backgroundColor: "#1E3A8A",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: "#0F766E",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ width: 30, height: 4, backgroundColor: "#FEF3C7", borderRadius: 2 }} />
          <View style={{ width: 22, height: 4, backgroundColor: "#FEF3C7", borderRadius: 2, marginTop: 3 }} />
          <View style={{ width: 14, height: 4, backgroundColor: "#FBBF24", borderRadius: 2, marginTop: 3 }} />
        </View>
      </View>
    </View>
  );
}

export function SuratRekomDocument(props: SuratProps) {
  const { nomorSurat, tglTerbitLabel, verifikasiUrl, qrDataUrl, namaKadis, nipKadis, isi } = props;

  return (
    <Document title={`Surat ${isi.judul} ${nomorSurat}`} author="Dinas Kesehatan Kabupaten Kutai Kartanegara">
      <Page size="A4" style={styles.page}>
        {/* ===== KOP SURAT ===== */}
        <View style={styles.kop} fixed>
          <Emblem />
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

        {/* ===== ISI SURAT ===== */}
        <View style={styles.nomorSurat}>
          <Text>Nomor : {nomorSurat}</Text>
          {isi.lampiran && isi.lampiran.trim() ? <Text>Lampiran : {isi.lampiran}</Text> : null}
        </View>
        <Text style={styles.judulSurat}>{isi.judul}</Text>

        <View style={styles.isi}>
          <Text>{isi.pembuka}</Text>
        </View>

        <View style={styles.tabelIdentitas}>
          {isi.barisIdentitas.map(([label, nilai]) => garisIdentitas(label, nilai))}
        </View>

        <View style={styles.penutup}>
          {isi.penutup.map((paragraf, i) => (
            <Text key={i} style={i > 0 ? { marginTop: 10 } : undefined}>
              {paragraf}
            </Text>
          ))}
        </View>

        {/* ===== TANDA TANGAN ===== */}
        <View style={styles.blokTtd}>
          <View style={styles.ttdKiri} />
          <View style={styles.ttdKanan}>
            <Text style={styles.ttdTanggal}>
              {isi.kotaTtd}, {tglTerbitLabel}
            </Text>
            <Text style={styles.ttdJabatan}>{isi.jabatanTtd}</Text>
            <Text style={styles.ttdNama}>{namaKadis}</Text>
            <Text style={styles.ttdNip}>{nipKadis}</Text>
          </View>
        </View>

        {/* ===== QR VERIFIKASI ===== */}
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
      </Page>
    </Document>
  );
}
