#!/usr/bin/env python3
"""Diagnosa produksi E-REKOM:
1) Reproduksi 404 pratinjau dokumen (/api/files/{id} dan /api/pengajuan/{id}/pdf)
2) Cari data 'Andi Dea Aulia Amanda' — di daftar pengajuan & daftar pengguna
"""
import json
import urllib.request
import urllib.error

BASE = "https://rekom.mukminnasri.com"
SUPERADMIN = ("superadmin@dinkes.go.id", "demo1234")


def req(method, path, cookie=None, body=None):
    headers = {}
    if cookie:
        headers["Cookie"] = cookie
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    r = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as res:
            return res.status, res.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def login(email, password):
    r = urllib.request.Request(
        f"{BASE}/api/auth/login",
        data=json.dumps({"email": email, "password": password}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(r, timeout=60) as res:
            sc = res.headers.get("Set-Cookie", "")
            print(f"login {email}: {res.status}")
            # gabungkan semua cookie sb-*
            cookies = []
            for part in sc.split(","):
                part = part.strip()
                if "=" in part and not part.lower().startswith(("path=", "expires=", "samesite=", "secure", "httponly", "domain=", "max-age=")):
                    cookies.append(part.split(";")[0])
            return "; ".join(cookies)
    except urllib.error.HTTPError as e:
        print(f"login {email} GAGAL: {e.code}: {e.read()[:200]}")
        return None


cookie = login(*SUPERADMIN)
if not cookie:
    raise SystemExit(1)
print("cookie:", cookie[:80], "...\n")

# ---- 1. daftar pengajuan (superadmin melihat semua) ----
st, body = req("GET", "/api/pengajuan", cookie=cookie)
print(f"GET /api/pengajuan -> {st}")
pengajuan = json.loads(body.decode()).get("data", [])
print(f"total pengajuan terlihat: {len(pengajuan)}")
for p in pengajuan:
    pemohon = (p.get("pemohon") or {}).get("namaLengkap", "?")
    print(f"  - {p.get('kode')} | {p.get('status'):18s} | pemohon={pemohon:35s} | judul={p.get('judulPengajuan')[:50]}")

print("\n---- cari 'Andi Dea' di pengajuan ----")
ketemu = False
for p in pengajuan:
    blob = json.dumps(p, ensure_ascii=False).lower()
    if "andi dea" in blob or "amanda" in blob:
        ketemu = True
        print("  KETEMU:", p.get("kode"), p.get("judulPengajuan"), (p.get("pemohon") or {}).get("namaLengkap"))
if not ketemu:
    print("  tidak ada di daftar pengajuan")

# ---- 2. daftar pengguna ----
st, body = req("GET", "/api/users", cookie=cookie)
print(f"\nGET /api/users -> {st}")
try:
    users = json.loads(body.decode()).get("data", [])
    print(f"total user terlihat: {len(users)}")
    for u in users:
        print(f"  - {u.get('email','?'):38s} | {u.get('namaLengkap','?'):38s} | role={u.get('role')}")
    for u in users:
        if "andi dea" in json.dumps(u, ensure_ascii=False).lower() or "amanda" in json.dumps(u, ensure_ascii=False).lower():
            print("  KETEMU user:", u)
except Exception as e:
    print("  parse gagal:", e, body[:200])

# ---- 3. tes semua dokumen pendukung & PDF resmi ----
print("\n---- tes pratinjau semua dokumen (cari 404) ----")
for p in pengajuan:
    pid = p.get("id")
    # PDF resmi
    st, body = req("GET", f"/api/pengajuan/{pid}/pdf", cookie=cookie)
    flag = "OK" if st == 200 else f"!!! {st} {body[:120]}"
    print(f"  PDF resmi {p.get('kode')}: {st} {flag if st != 200 else ''}")
    # dokumen
    for d in p.get("dokumen", []):
        st, body = req("GET", f"/api/files/{d['id']}", cookie=cookie)
        cdisp = ""
        print(f"  dok {d['id'][:8]} {d.get('namaDokumen','?')[:40]:40s} tipe={d.get('tipeFile','?'):15s} -> {st} {'' if st == 200 else body[:150]}")
