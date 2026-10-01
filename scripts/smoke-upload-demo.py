#!/usr/bin/env python3
"""Smoke test lokal (mode demo): alur upload dokumen baru + pratinjau.
Mensimulasikan persis urutan request yang dilakukan halaman pengajuan
setelah perbaikan: /api/upload (dengan metadata lengkap) -> /api/pengajuan/{id}/dokumen
-> pratinjau /api/files/{dokId}."""
import io
import json
import urllib.request
import urllib.error

BASE = "http://localhost:3210"

# PDF minimal valid
PDF = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\nxref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\n%%EOF"


def req(method, path, cookie=None, body=None, raw_body=None, headers_extra=None):
    headers = dict(headers_extra or {})
    if cookie:
        headers["Cookie"] = cookie
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    elif raw_body is not None:
        data = raw_body
    r = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as res:
            return res.status, res.read(), dict(res.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)


def login_cookie(hh):
    for k, v in hh.items():
        if k.lower() == "set-cookie":
            return v.split(";")[0]
    return ""


# 1) login superadmin (demo)
st, body, hh = req("POST", "/api/auth/login", body={"email": "superadmin@dinkes.go.id", "password": "demo1234"})
print("login:", st)
cookie = login_cookie(hh)

# 2) ambil jenis
st, body, _ = req("GET", "/api/jenis", cookie=cookie)
jenis = json.loads(body)["data"][0]
print("jenis:", jenis["kodeJenis"])

# 3) buat pengajuan
st, body, _ = req("POST", "/api/pengajuan", cookie=cookie, body={
    "jenisId": jenis["id"],
    "judulPengajuan": "Uji Pratinjau Setelah Perbaikan",
    "dataFormJson": json.dumps({"keperluan": "uji"}),
})
print("buat pengajuan:", st, body[:200])
pid = json.loads(body)["data"]["id"]
print("id:", pid[:8])

# 4) unggah via /api/upload — respons kini harus punya tipeFile & ukuran
boundary = "----erekomsmoke"
mp = io.BytesIO()
mp.write(f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"uji.pdf\"\r\nContent-Type: application/pdf\r\n\r\n".encode())
mp.write(PDF)
mp.write(f"\r\n--{boundary}--\r\n".encode())
st, body, _ = req("POST", "/api/upload", cookie=cookie, raw_body=mp.getvalue(),
                  headers_extra={"Content-Type": f"multipart/form-data; boundary={boundary}"})
up = json.loads(body)["data"]
print("upload:", st, "->", up)
assert up.get("tipeFile") == "application/pdf" and up.get("ukuran", 0) > 0, "metadata upload tidak lengkap!"

# 5) simpan metadata dokumen (seperti halaman)
st, body, _ = req("POST", f"/api/pengajuan/{pid}/dokumen", cookie=cookie, body={
    "namaDokumen": "Dokumen Uji", "fileUrl": up["fileUrl"], "tipeFile": up["tipeFile"], "ukuran": up["ukuran"],
})
print("simpan metadata:", st)

# 6) pratinjau via /api/files/{dokId} — ambil id dari daftar
st, body, _ = req("GET", f"/api/pengajuan/{pid}", cookie=cookie)
dok = json.loads(body)["data"]["dokumen"][0]
print("dokumen:", dok["namaDokumen"], dok["fileUrl"], dok["tipeFile"], dok["ukuran"])
st, body, _ = req("GET", f"/api/files/{dok['id']}", cookie=cookie)
print("pratinjau /api/files/{id}:", st, body[:8], "PDF-OK" if body[:4] == b"%PDF" else "GAGAL")
st, body, _ = req("GET", up["fileUrl"], cookie=cookie)
print("pratinjau /api/files/{uuid}.ext:", st, "PDF-OK" if body[:4] == b"%PDF" else f"GAGAL {body[:120]}")

# 7) bereskan
req("DELETE", f"/api/pengajuan/dokumen/{dok['id']}", cookie=cookie)
req("DELETE", f"/api/pengajuan/{pid}", cookie=cookie)
print("cleanup OK")
