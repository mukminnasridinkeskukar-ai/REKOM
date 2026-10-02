#!/usr/bin/env python3
"""Debug: (a) detail 2 objek di akar bucket, (b) coba hapus objek uji + lihat body error."""
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
        data = data.encode() if isinstance(data, str) else json.dumps(data).encode()
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

print("=== Daftar lengkap objek bucket (nama mentah) ===")
st, res = req(f"{URL}/storage/v1/object/list/dokumen-rekom", "POST",
              json.dumps({"prefix": "", "limit": 1000, "offset": 0,
                          "sortBy": {"column": "created_at", "order": "asc"}}),
              headers=H)
print("status:", st)
items = json.loads(res)
for it in items:
    md = it.get("metadata") or {}
    print(f"  - name={it.get('name')!r} size={md.get('size')} "
          f"updated={str(it.get('updated_at'))[:19]} id={str(it.get('id'))[:8]}")

print("\n=== Coba hapus objek uji (lihat body error) ===")
st, res = req(f"{URL}/storage/v1/object/list/dokumen-rekom", "POST",
              json.dumps({"prefix": "Pemohon-Uji--5716a034/", "limit": 100}),
              headers=H)
print("listing folder pemohon:", st, res[:200])
for it in json.loads(res) if st == 200 else []:
    full = f"Pemohon-Uji--5716a034/{it['name']}"
    st2, res2 = req(f"{URL}/storage/v1/object/dokumen-rekom/{full}", "DELETE", headers=H)
    print(f"  hapus {full} -> {st2} {res2[:160]}")
