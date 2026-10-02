#!/usr/bin/env python3
"""Uji siklus storage Supabase produksi sebagai user login (simulasi browser):
1. login -> access token
2. upload objek ke bucket dokumen-rekom (path tmp/uji-<ts>.txt)
3. createSignedUrl
4. GET signed URL
5. hapus objek uji
"""
import base64
import json
import urllib.request
import urllib.error

info = json.load(open("/home/z/my-project/.smoke/prod-supabase.json"))
URL, ANON = info["url"], info["anonKey"]
APP = "https://rekom.mukminnasri.com"


def app_login():
    r = urllib.request.Request(
        f"{APP}/api/auth/login",
        data=json.dumps({"email": "superadmin@dinkes.go.id", "password": "demo1234"}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(r, timeout=60) as res:
        sc = res.headers.get("Set-Cookie", "")
    # cookie auth token: "base64-<urlsafe b64>" -> decode utk ambil access_token
    val = None
    chunks = {}
    for part in sc.split(","):
        part = part.strip()
        if "auth-token=" in part and "auth-token." not in part:
            val = part.split("auth-token=")[1].split(";")[0]
        elif "auth-token." in part:
            idx = int(part.split("auth-token.")[1][0])
            chunks[idx] = part.split("=", 1)[1].split(";")[0]
    if not val and chunks:
        val = "".join(chunks[k] for k in sorted(chunks))
    if val:
        if val.startswith("base64-"):
            val = val[len("base64-"):]
        raw = base64.urlsafe_b64decode(val + "=" * (-len(val) % 4))
        return json.loads(raw)["access_token"]
    raise SystemExit("token tidak ditemukan")


tok = app_login()
print("access token OK:", tok[:30], "...")

path = f"tmp/uji-storage-{int(__import__('time').time() * 1000)}.txt"
body = b"UJI-EREKOM-STORAGE"

# 1) upload
r = urllib.request.Request(
    f"{URL}/storage/v1/object/dokumen-rekom/{path}",
    data=body,
    headers={"Authorization": f"Bearer {tok}", "apikey": ANON, "Content-Type": "text/plain"},
    method="POST",
)
try:
    with urllib.request.urlopen(r, timeout=30) as res:
        print("upload:", res.status, res.read()[:120])
except urllib.error.HTTPError as e:
    print("upload GAGAL:", e.code, e.read()[:300])
    raise SystemExit(1)

# 2) signed url
r = urllib.request.Request(
    f"{URL}/storage/v1/object/sign/dokumen-rekom/{path}",
    data=json.dumps({"expiresIn": 3600}).encode(),
    headers={"Authorization": f"Bearer {tok}", "apikey": ANON, "Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(r, timeout=30) as res:
        data = json.loads(res.read())
        signed = f"{URL}/storage/v1{data['signedURL']}"
        print("signed URL OK")
except urllib.error.HTTPError as e:
    print("signed URL GAGAL:", e.code, e.read()[:300])
    raise SystemExit(1)

# 3) GET signed url
with urllib.request.urlopen(signed, timeout=30) as res:
    print("GET signed:", res.status, res.read())

# 4) hapus
r = urllib.request.Request(
    f"{URL}/storage/v1/object/dokumen-rekom/{path}",
    data=json.dumps({"prefixes": [f"dokumen-rekom/{path}"]}).encode(),
    headers={"Authorization": f"Bearer {tok}", "apikey": ANON, "Content-Type": "application/json"},
    method="DELETE",
)
try:
    with urllib.request.urlopen(r, timeout=30) as res:
        print("hapus:", res.status)
except urllib.error.HTTPError as e:
    print("hapus (abaikan):", e.code)

print("\nKESIMPULAN: storage bucket dokumen-rekom BERFUNGSI utk user terautentikasi.")
