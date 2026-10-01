#!/usr/bin/env python3
"""Lihat file_url mentah tiap dokumen + coba endpoint files dengan detail."""
import json
import urllib.request
import urllib.error

BASE = "https://rekom.mukminnasri.com"

r = urllib.request.Request(
    f"{BASE}/api/auth/login",
    data=json.dumps({"email": "superadmin@dinkes.go.id", "password": "demo1234"}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(r, timeout=60) as res:
    sc = res.headers.get("Set-Cookie", "")
cookies = []
for part in sc.split(","):
    part = part.strip()
    if "=" in part and not part.lower().startswith(("path=", "expires=", "samesite=", "secure", "httponly", "domain=", "max-age=")):
        cookies.append(part.split(";")[0])
cookie = "; ".join(cookies)

req = urllib.request.Request(f"{BASE}/api/pengajuan", headers={"Cookie": cookie})
with urllib.request.urlopen(req, timeout=60) as res:
    pengajuan = json.loads(res.read().decode()).get("data", [])

for p in pengajuan:
    print(f"== {p.get('kode')} ({p.get('status')}) ==")
    for d in p.get("dokumen", []):
        print(f"  dok id={d['id']}")
        print(f"    namaDokumen = {d.get('namaDokumen')}")
        print(f"    fileUrl     = {repr(d.get('fileUrl'))}")
        print(f"    tipeFile    = {d.get('tipeFile')}")
        print(f"    ukuran      = {d.get('ukuran')}")
