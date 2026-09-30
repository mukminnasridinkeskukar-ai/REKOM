#!/usr/bin/env python3
"""Smoke test lokal: login superadmin (mode demo) -> pratinjau surat default & custom -> PDF OK?"""
import json
import urllib.request

BASE = "http://localhost:3000"

def post(path, data, cookie=None, raw=False):
    body = json.dumps(data).encode() if not raw else data
    h = {"Content-Type": "application/json"}
    if cookie:
        h["Cookie"] = cookie
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status, r.headers, r.read()

# 1) login
try:
    st, hh, body = post("/api/auth/login", {"email": "superadmin@dinkes.go.id", "password": "demo1234"})
    print("login:", st)
except urllib.error.HTTPError as e:
    print("login gagal:", e.code, e.read().decode()[:200]); raise SystemExit(1)
cookie = hh.get("Set-Cookie", "").split(";")[0]

# 2) daftar jenis
req = urllib.request.Request(f"{BASE}/api/jenis?activeOnly=false", headers={"Cookie": cookie})
with urllib.request.urlopen(req, timeout=30) as r:
    jenis = json.loads(r.read().decode()).get("data", [])
print("jenis:", [(j["kodeJenis"], j["templateSurat"] is not None) for j in jenis][:6])
jenis_id = jenis[0]["id"] if jenis else None

# 3) pratinjau default
st, hh, blob = post("/api/jenis/pratinjau-surat", {"jenisId": jenis_id}, cookie=cookie)
print("pratinjau default:", st, hh.get("Content-Type"), f"{len(blob)} bytes", "PDF" if blob[:4] == b"%PDF" else "BUKAN PDF")

# 4) pratinjau template kustom (edit redaksi + identitas) — belum disimpan
custom = {
    "judul": "Surat Rekomendasi Khusus",
    "lampiran": "",
    "pembuka": "Yang bertanda tangan di bawah ini, dengan ini merekomendasikan kepada:",
    "barisIdentitas": [
        {"label": "Nama Lengkap", "kunci": "nama_pemohon"},
        {"label": "NIK", "kunci": "nip_nik"},
        {"label": "Instansi Asal", "kunci": "instansi"},
        {"label": "Keperluan", "kunci": "keperluan"},
    ],
    "penutup": [
        'Berdasarkan pengajuan "{judul}" jenis {jenis_rekomendasi}, bersangkutan dinyatakan memenuhi persyaratan.',
        "Demikian untuk dipergunakan sebagaimana mestinya.",
    ],
    "jabatanTtd": "Kepala Dinas Kesehatan\nKabupaten Kutai Kartanegara,",
    "kotaTtd": "Tenggarong",
}
st, hh, blob = post(
    "/api/jenis/pratinjau-surat",
    {"jenisId": jenis_id, "templateSurat": json.dumps(custom)},
    cookie=cookie,
)
print("pratinjau kustom:", st, f"{len(blob)} bytes", "PDF" if blob[:4] == b"%PDF" else "BUKAN PDF")

# 5) simpan template ke jenis, verifikasi tersimpan, lalu kembalikan null
req = urllib.request.Request(
    f"{BASE}/api/jenis/{jenis_id}",
    data=json.dumps({"templateSurat": json.dumps(custom)}).encode(),
    headers={"Content-Type": "application/json", "Cookie": cookie},
    method="PATCH",
)
with urllib.request.urlopen(req, timeout=30) as r:
    print("simpan template:", r.status)
req = urllib.request.Request(f"{BASE}/api/jenis?activeOnly=false", headers={"Cookie": cookie})
with urllib.request.urlopen(req, timeout=30) as r:
    j0 = [j for j in json.loads(r.read().decode())["data"] if j["id"] == jenis_id][0]
    print("tersimpan:", j0["templateSurat"] is not None)
req = urllib.request.Request(
    f"{BASE}/api/jenis/{jenis_id}",
    data=json.dumps({"templateSurat": None}).encode(),
    headers={"Content-Type": "application/json", "Cookie": cookie},
    method="PATCH",
)
with urllib.request.urlopen(req, timeout=30) as r:
    print("reset ke default:", r.status)
print("SMOKE TEST SELESAI")
