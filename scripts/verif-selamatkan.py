#!/usr/bin/env python3
"""Pasca-penyelamatan: (1) isi kolom ukuran dari metadata objek tujuan,
(2) uji signed URL tiap dokumen, (3) uji end-to-end /api/files/{id} via sesi superadmin."""
import base64
import json
import urllib.request
import urllib.error
from urllib.parse import quote

info = json.load(open("/home/z/my-project/.smoke/prod-supabase.json"))
URL, ANON = info["url"], info["anonKey"]
APP = "https://rekom.mukminnasri.com"
BUCKET = "dokumen-rekom"
hasil = json.load(open("/home/z/my-project/.smoke/hasil-selamatkan.json"))


def req(url, method="GET", data=None, headers=None):
    h = {"apikey": ANON, "Content-Type": "application/json"}
    if headers:
        h.update(headers)
    if data is not None and not isinstance(data, bytes):
        data = json.dumps(data).encode() if not isinstance(data, str) else data.encode()
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as res:
            return res.status, res.read().decode("utf-8", "replace"), res.headers
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace"), e.headers


def login(email):
    st, res, _ = req(f"{URL}/auth/v1/token?grant_type=password", "POST",
                     json.dumps({"email": email, "password": "demo1234"}))
    if st != 200:
        raise SystemExit(f"login {email} gagal: {st}")
    return json.loads(res)["access_token"]


def app_cookie_token(email):
    """Login via aplikasi (cookie auth-token) utk uji /api/files end-to-end."""
    r = urllib.request.Request(
        f"{APP}/api/auth/login",
        data=json.dumps({"email": email, "password": "demo1234"}).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(r, timeout=60) as res:
        sc = res.headers.get("Set-Cookie", "")
    val, chunks = None, {}
    for part in sc.split(","):
        part = part.strip()
        if "auth-token=" in part and "auth-token." not in part:
            val = part.split("auth-token=")[1].split(";")[0]
        elif "auth-token." in part:
            chunks[int(part.split("auth-token.")[1][0])] = part.split("=", 1)[1].split(";")[0]
    if not val and chunks:
        val = "".join(chunks[k] for k in sorted(chunks))
    if val and val.startswith("base64-"):
        val = val[len("base64-"):]
    raw = base64.urlsafe_b64decode(val + "=" * (-len(val) % 4))
    return json.loads(raw)["access_token"]


tok = login("superadmin@dinkes.go.id")
H = {"Authorization": f"Bearer {tok}"}
induk_cache = {}

print("=== 1. Isi kolom ukuran ===")
for it in hasil:
    dest = it["path_baru"]
    induk = dest.rsplit("/", 1)[0]
    nama = dest.rsplit("/", 1)[1]
    if induk not in induk_cache:
        st, res, _ = req(f"{URL}/storage/v1/object/list/{BUCKET}", "POST",
                         json.dumps({"prefix": induk + "/", "limit": 100}), headers=H)
        induk_cache[induk] = {x["name"]: (x.get("metadata") or {}).get("size")
                              for x in json.loads(res)} if st == 200 else {}
    ukuran = induk_cache[induk].get(nama) or 0
    if ukuran:
        st2, _, _ = req(f"{URL}/rest/v1/dokumen_pendukung?id=eq.{it['id']}", "PATCH",
                        {"ukuran": ukuran}, headers=H)
        print(f"  {'OK ' if st2 in (200, 204) else 'GAGAL'} ukuran={ukuran:>9} {dest[:76]}")
    else:
        print(f"  ?? metadata tak ketemu: {dest[:76]}")

print("\n=== 2. Uji signed URL tiap dokumen ===")
semua_ok = True
for it in hasil:
    pth = quote(it["path_baru"], safe="/")
    st, res, _ = req(f"{URL}/storage/v1/object/sign/{BUCKET}/{pth}", "POST",
                     {"expiresIn": 60}, headers=H)
    if st != 200:
        print(f"  GAGAL sign {st}: {it['path_baru'][:70]}")
        semua_ok = False
        continue
    surl = json.loads(res).get("signedURL")
    st2, body, hdr = req(f"{URL}/storage/v1{quote(surl, safe='/?&=%.')}", method="GET")
    ct = hdr.get("Content-Type", "?") if st2 == 200 else "-"
    ok = st2 == 200 and int(hdr.get("Content-Length", 0) or 0) > 1000
    print(f"  {'OK ' if ok else 'GAGAL'} {st2} ct={ct[:40]} {it['path_baru'][:62]}")
    semua_ok = semua_ok and ok

print("\n=== 3. End-to-end /api/files/{id} via aplikasi (superadmin) ===")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


opener = urllib.request.build_opener(NoRedirect)

try:
    lr = urllib.request.Request(
        f"{APP}/api/auth/login",
        data=json.dumps({"email": "superadmin@dinkes.go.id", "password": "demo1234"}).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(lr, timeout=60) as lres:
        setc = lres.headers.get("Set-Cookie", "")
    cookie = "; ".join(p.strip().split(";")[0] for p in setc.split(",")
                       if "auth-token" in p)
    print(f"  cookie sesi aplikasi: {'OK' if cookie else 'KOSONG'} ({len(cookie)} karakter)")
except Exception as ex:
    cookie = ""
    print(f"  login aplikasi gagal: {ex}")

for it in hasil:
    r2 = urllib.request.Request(f"{APP}/api/files/{it['id']}", headers={"Cookie": cookie})
    try:
        with opener.open(r2, timeout=60) as res:
            st3, loc, ct = res.status, "-", res.headers.get("Content-Type", "?")
    except urllib.error.HTTPError as e:
        st3, loc, ct = e.code, e.headers.get("Location", "-"), e.headers.get("Content-Type", "?")
    tag = "302->signed" if st3 == 302 else str(st3)
    print(f"  {tag:<12} {it['path_baru'][:64]}")
    if st3 == 302 and "sign" in (loc or ""):
        try:
            with urllib.request.urlopen(loc, timeout=60) as fin:
                ct2 = fin.headers.get("Content-Type", "?")
                n = len(fin.read())
                print(f"      ikut redirect: {fin.status} {ct2[:36]} ({n} byte)")
        except urllib.error.HTTPError as e2:
            print(f"      redirect gagal: {e2.code}")

print(f"\nSigned URL semua OK: {semua_ok}")
