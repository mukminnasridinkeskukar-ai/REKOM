#!/usr/bin/env python3
"""Diagnosa produksi: /api/upload (500?) dan /api/auth/register (400?)."""
import io
import json
import os
import urllib.request
import urllib.error

BASE = "https://rekom.mukminnasri.com"


def req(method, path, cookie=None, body=None, raw_body=None, headers_extra=None):
    headers = {}
    if cookie:
        headers["Cookie"] = cookie
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    elif raw_body is not None:
        data = raw_body
        headers.update(headers_extra or {})
    else:
        data = None
    r = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=40) as res:
            return res.status, res.read()[:400].decode(errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read()[:400].decode(errors="replace")


def login(email, password="demo1234"):
    st, body = req("POST", "/api/auth/login", body={"email": email, "password": password})
    print(f"login {email}: {st}")
    if st != 200:
        return None
    # ambil cookie dari Set-Cookie header: perlu header penuh
    r = urllib.request.Request(f"{BASE}/api/auth/login", data=json.dumps({"email": email, "password": password}).encode(), headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(r, timeout=40) as res:
        sc = res.headers.get("Set-Cookie", "")
    return sc.split(";")[0]


# PDF minimal valid
PDF = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\nxref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\n%%EOF"

print("== TES 1: login pemohon ==")
c = login("pemohon@dinkes.go.id")
print("cookie:", (c or "")[:40], "...")

print("\n== TES 2: POST /api/upload (harusnya dipakai mode demo saja) ==")
boundary = "----ujiupload123"
part = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="uji.pdf"\r\n'
    f"Content-Type: application/pdf\r\n\r\n"
).encode() + PDF + f"\r\n--{boundary}--\r\n".encode()
st, body = req("POST", "/api/upload", cookie=c, raw_body=part, headers_extra={"Content-Type": f"multipart/form-data; boundary={boundary}"})
print(f"  -> HTTP {st}: {body}")

print("\n== TES 3: POST /api/auth/register email baru ==")
st, body = req("POST", "/api/auth/register", body={
    "email": f"uji.daftar.{os.urandom(2).hex()}@contoh.test",
    "password": "sandirahasia123",
    "namaLengkap": "Uji Daftar",
})
print(f"  -> HTTP {st}: {body}")

print("\n== TES 4: POST /api/auth/register password pendek ==")
st, body = req("POST", "/api/auth/register", body={
    "email": "uji.pendek@contoh.test",
    "password": "123",
    "namaLengkap": "Uji Pendek",
})
print(f"  -> HTTP {st}: {body}")
