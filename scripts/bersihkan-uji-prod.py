#!/usr/bin/env python3
"""Bersihkan objek uji di bucket produksi (perbaikan: DELETE wajib punya body)."""
import json
import urllib.request
import urllib.error

info = json.load(open("/home/z/my-project/.smoke/prod-supabase.json"))
URL, ANON = info["url"], info["anonKey"]


def req(url, method="GET", data=None, headers=None):
    h = {"apikey": ANON, "Content-Type": "application/json"}
    if headers:
        h.update(headers)
    if data is not None and not isinstance(data, bytes):
        data = json.dumps(data).encode() if not isinstance(data, str) else data.encode()
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as res:
            return res.status, res.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


st, res = req(f"{URL}/auth/v1/token?grant_type=password", "POST",
              json.dumps({"email": "pemohon@dinkes.go.id", "password": "demo1234"}))
tok = json.loads(res)["access_token"]
H = {"Authorization": f"Bearer {tok}"}

target_prefixes = ["Pemohon-Uji--5716a034/", "tmp/"]
total_hapus = 0
for prefix in target_prefixes:
    st, res = req(f"{URL}/storage/v1/object/list/dokumen-rekom", "POST",
                  json.dumps({"prefix": prefix, "limit": 100}), headers=H)
    if st != 200:
        print(f"listing {prefix} -> {st} {res[:100]}")
        continue
    for it in json.loads(res):
        full = f"{prefix}{it['name']}"
        st2, res2 = req(f"{URL}/storage/v1/object/dokumen-rekom/{full}", "DELETE",
                        data={}, headers=H)
        status = "hapus" if st2 in (200, 204) else f"GAGAL {st2}"
        print(f"  {status}: {full} ({res2[:80] if st2 not in (200, 204) else 'ok'})")
        total_hapus += 1 if st2 in (200, 204) else 0

print(f"\nTotal dihapus: {total_hapus}")

print("\n=== Sisa isi bucket (tingkat akar) ===")
st, res = req(f"{URL}/storage/v1/object/list/dokumen-rekom", "POST",
              json.dumps({"prefix": "", "limit": 100}), headers=H)
for it in json.loads(res) if st == 200 else []:
    print(f"  - {it.get('name')!r}")
if st == 200 and not json.loads(res):
    print("  (bucket bersih — kosong)")
