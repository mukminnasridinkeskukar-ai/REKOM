#!/usr/bin/env python3
"""Smoke test: pratinjau surat mode demo — default, klasik kustom, dan template afirmasi (gaya pernyataan + TTD elektronik)."""
import json
import urllib.request

BASE = "http://localhost:3000"
OUT = "/home/z/my-project/.smoke"

import os
os.makedirs(OUT, exist_ok=True)

def post(path, data, cookie=None):
    body = json.dumps(data).encode()
    h = {"Content-Type": "application/json"}
    if cookie:
        h["Cookie"] = cookie
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.status, r.headers, r.read()

# 1) login (mode demo)
try:
    st, hh, body = post("/api/auth/login", {"email": "superadmin@dinkes.go.id", "password": "demo1234"})
    print("login:", st)
except urllib.error.HTTPError as e:
    print("login gagal:", e.code, e.read().decode()[:200]); raise SystemExit(1)
cookie = hh.get("Set-Cookie", "").split(";")[0]

# 2) pratinjau default (kompatibilitas lama)
st, hh, blob = post("/api/jenis/pratinjau-surat", {}, cookie=cookie)
ok1 = st == 200 and blob[:4] == b"%PDF"
print("pratinjau default:", st, f"{len(blob)} bytes", "PDF-OK" if ok1 else "GAGAL")
if ok1:
    open(f"{OUT}/default.pdf", "wb").write(blob)

# 3) template afirmasi — gaya pernyataan + TTD elektronik (format resmi Dinkes)
afirmasi = {
    "judul": "SURAT PERNYATAAN PENDAYAGUNAAN",
    "lampiran": "",
    "letakNomor": "bawah",
    "pembuka": "Yang bertanda tangan di bawah ini:",
    "barisIdentitas": [
        {"label": "nama", "kunci": "nama_kadis"},
        {"label": "NIP", "kunci": "nip_kadis"},
        {"label": "pangkat/golongan", "kunci": "", "nilai": "Pembina Tk.I/IVb"},
        {"label": "jabatan", "kunci": "", "nilai": "Kepala Dinas"},
        {"label": "unit kerja", "kunci": "", "nilai": "Dinas Kesehatan"},
        {"label": "Kab./Kota", "kunci": "", "nilai": "Kabupaten Kutai Kartanegara"},
        {"label": "Provinsi", "kunci": "", "nilai": "Kalimantan Timur"},
    ],
    "pembukaKedua": "Menyatakan dengan sesungguhnya bahwa nama yang tercantum di bawah ini:",
    "barisIdentitasKedua": [
        {"label": "nama", "kunci": "nama_lengkap"},
        {"label": "NIK", "kunci": "nik"},
        {"label": "fakultas", "kunci": "", "nilai": "Fakultas {pendidikan_terakhir} {asal_kampus/_pt}"},
        {"label": "alamat sesuai KTP", "kunci": "alamat_domisili"},
    ],
    "penutup": [
        "Setelah menyelesaikan pendidikan akan diterima kembali untuk didayagunakan di {puskesmas_tujuan} milik Pemerintah Daerah Kabupaten Kutai Kartanegara Provinsi Kalimantan Timur dengan ketentuan:",
        "1. bersedia mengusulkan formasi ASN untuk yang bersangkutan sesuai ketentuan peraturan perundang-undangan.",
        "2. menyediakan sarana dan prasarana untuk menunjang pelaksanaan tugas sesuai kompetensi serta fasilitas lainnya sesuai ketentuan peraturan perundang-undangan.",
        "3. apabila yang bersangkutan tidak dapat didayagunakan di {puskesmas_tujuan}, maka dapat didayagunakan pada Puskesmas lain yang masih membutuhkan di wilayah Kabupaten Kutai Kartanegara atau di wilayah Provinsi Kalimantan Timur.",
        "4. apabila yang bersangkutan tidak dapat didayagunakan di wilayah Provinsi Kalimantan Timur, maka yang bersangkutan akan didayagunakan oleh Kementerian Kesehatan sesuai kebutuhan prioritas nasional.",
        "Demikian Surat Pernyataan ini kami buat untuk dapat digunakan sebagaimana semestinya.",
    ],
    "penempatanTtd": ["Ditetapkan di: Tenggarong", "Pada tanggal: {tgl_terbit}"],
    "gayaTtd": "elektronik",
    "pangkatTtd": "Pembina Tingkat I",
    "jabatanTtd": "KEPALA DINAS KESEHATAN",
    "kotaTtd": "Tenggarong",
}
st, hh, blob = post("/api/jenis/pratinjau-surat", {"templateSurat": json.dumps(afirmasi)}, cookie=cookie)
ok3 = st == 200 and blob[:4] == b"%PDF"
print("pratinjau afirmasi:", st, f"{len(blob)} bytes", "PDF-OK" if ok3 else "GAGAL")
if ok3:
    open(f"{OUT}/afirmasi.pdf", "wb").write(blob)
else:
    print("  detail:", blob[:300])

# 4) klasik kustom (perilaku lama tetap jalan)
klasik = {
    "judul": "Surat Rekomendasi Khusus",
    "lampiran": "1 (satu) berkas",
    "pembuka": "Yang bertanda tangan di bawah ini Kepala Dinas Kesehatan Kabupaten Kutai Kartanegara memberikan rekomendasi kepada:",
    "barisIdentitas": [
        {"label": "Nama", "kunci": "nama_pemohon"},
        {"label": "NIP/NIK", "kunci": "nip_nik"},
    ],
    "penutup": ["Demikian surat ini dibuat untuk dipergunakan sebagaimana mestinya."],
    "jabatanTtd": "Kepala Dinas Kesehatan\nKabupaten Kutai Kartanegara,",
    "kotaTtd": "Tenggarong",
}
st, hh, blob = post("/api/jenis/pratinjau-surat", {"templateSurat": json.dumps(klasik)}, cookie=cookie)
ok4 = st == 200 and blob[:4] == b"%PDF"
print("pratinjau klasik kustom:", st, f"{len(blob)} bytes", "PDF-OK" if ok4 else "GAGAL")

print()
print("HASIL:", "SEMUA LOLOS" if (ok1 and ok3 and ok4) else "ADA YANG GAGAL")
