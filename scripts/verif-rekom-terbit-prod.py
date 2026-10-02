#!/usr/bin/env python3
# Verifikasi produksi: fitur berkas surat terbit dari bucket rekom-terbit
# Tahap 1 (sebelum SQL user): bucket ada + route baru hidup (401 HTML)
# Tahap 2 (setelah SQL user): policy unggah/list + RPC rekom_berkas_publik
import json, os, urllib.request, urllib.error

BASE = os.path.expanduser("~/my-project")
conf = json.load(open(f"{BASE}/.smoke/prod-supabase.json"))
URL, KEY = conf["url"].rstrip("/"), conf["anonKey"]

def req(url, method="GET", data=None, headers=None, token=None):
    h = {"apikey": KEY, "Authorization": f"Bearer {token or KEY}"}
    if headers: h.update(headers)
    if data is not None and not isinstance(data, bytes):
        data = data.encode() if isinstance(data, str) else json.dumps(data).encode()
    r = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(r, timeout=30) as res:
            return res.status, res.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()

def login(email, pwd):
    st, body = req(f"{URL}/auth/v1/token?grant_type=password", "POST",
                   {"email": email, "password": pwd},
                   {"Content-Type": "application/json"})
    return json.loads(body).get("access_token") if st == 200 else None

print("=== TAHAP 1: bucket & route ===")
st, body = req(f"{URL}/storage/v1/bucket", token=login("superadmin@dinkes.go.id", "demo1234"))
buckets = [b.get("name") for b in json.loads(body or b"[]")]
print(f"bucket rekom-terbit: {'ADA' if 'rekom-terbit' in buckets else 'TIDAK ADA'} (semua: {buckets})")

# route baru hidup? (aplikasi produksi)
import ssl; ctx = ssl.create_default_context()
try:
    r = urllib.request.urlopen("https://rekom.mukminnasri.com/api/rekom-terbit/cek-route", timeout=30)
    print(f"route /api/rekom-terbit: {r.status} (harusnya 4xx)")
except urllib.error.HTTPError as e:
    html = e.read().decode("utf-8", "ignore")
    ramah = "E-REKOM" in html and "Sesi Berakhir" in html
    print(f"route /api/rekom-terbit: {e.code} — halaman ramah: {'YA' if ramah else html[:120]}")
except Exception as e:
    print(f"route /api/rekom-terbit: GAGAL {e}")

print()
print("=== TAHAP 2: policy & RPC (jalankan lagi SETELAH SQL dijalankan) ===")
tok_super = login("superadmin@dinkes.go.id", "demo1234")
# RPC tersedia?
st, body = req(f"{URL}/rest/v1/rpc/rekom_berkas_publik", "POST",
               {"p_qr": "00000000-0000-0000-0000-000000000000"},
               {"Content-Type": "application/json", "Prefer": "return=representation"}, token=tok_super)
print(f"RPC rekom_berkas_publik: {st} {'OK (aktif)' if st == 200 else 'BELUM (' + body[:100].decode('utf-8','ignore') + ')'}")

# unggah uji ke rekom-terbit sebagai super_admin
path_uji = "uji-verif/verif-rekom-terbit.txt"
st, body = req(f"{URL}/storage/v1/object/rekom-terbit/{path_uji}", "POST",
               b"uji policy rekom-terbit", {"Content-Type": "text/plain", "x-upsert": "false"}, token=tok_super)
print(f"unggah super_admin ke rekom-terbit: {st} {'OK' if st == 200 else body[:140].decode('utf-8','ignore')}")
if st == 200:
    # URL publik harus bisa diakses tanpa auth
    r = urllib.request.urlopen(f"{URL}/storage/v1/object/public/rekom-terbit/{path_uji}", timeout=30, context=ssl.create_default_context())
    print(f"URL publik berkas: {r.status} (isi: {r.read().decode()})")
    # daftar (list) via klien terautentikasi
    st, body = req(f"{URL}/storage/v1/object/list/rekom-terbit", "POST",
                   {"prefix": "uji-verif", "limit": 10},
                   {"Content-Type": "application/json"}, token=tok_super)
    print(f"list folder uji-verif: {st} ({len(json.loads(body or b'[]'))} objek)")
    # hapus objek uji
    st, body = req(f"{URL}/storage/v1/object/rekom-terbit/{path_uji}", "DELETE", {},
                   {"Content-Type": "application/json"}, token=tok_super)
    print(f"hapus berkas uji: {st}")
