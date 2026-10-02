#!/usr/bin/env python3
"""Cek dokumen_pendukung via superadmin: file_url mana yang menunjuk tmp/ dsb,
lalu selamatkan berkas lama yang byte-nya masih ada di storage (pindah ke folder pemohon)."""
import json
import time
import urllib.request
import urllib.error

info = json.load(open("/home/z/my-project/.smoke/prod-supabase.json"))
URL, ANON = info["url"], info["anonKey"]
APP = "https://rekom.mukminnasri.com"


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


def login(email):
    st, res = req(f"{URL}/auth/v1/token?grant_type=password", "POST",
                  json.dumps({"email": email, "password": "demo1234"}))
    if st != 200:
        raise SystemExit(f"login {email} gagal: {st} {res[:100]}")
    return json.loads(res)["access_token"]


tok = login("superadmin@dinkes.go.id")
H = {"Authorization": f"Bearer {tok}"}

print("=== Semua dokumen_pendukung (id, file_url, created) ===")
st, res = req(f"{APP}/api/users", headers=H)
st, res = req(f"{URL}/rest/v1/dokumen_pendukung?select=id,pengajuan_id,jenis_dokumen,file_url,tipe_file,created_at&order=created_at.asc", "GET", headers=H)
print("status:", st)
docs = json.loads(res) if st == 200 else []
for d in docs:
    print(f"  - {str(d.get('id'))[:8]} jenis={d.get('jenis_dokumen')} "
          f"tipe={d.get('tipe_file')} created={str(d.get('created_at'))[:10]}")
    print(f"      file_url={d.get('file_url')}")

print("\n=== Objek nyata di storage (rekursif per folder akar) ===")
st, res = req(f"{URL}/storage/v1/object/list/dokumen-rekom", "POST",
              json.dumps({"prefix": "", "limit": 100}), headers=H)
root = json.loads(res) if st == 200 else []
semua = []
for it in root:
    if it.get("id"):  # berkas sungguhan
        semua.append(it["name"])
    else:  # folder -> turun
        pfx = it["name"].rstrip("/") + "/"
        st2, res2 = req(f"{URL}/storage/v1/object/list/dokumen-rekom", "POST",
                        json.dumps({"prefix": pfx, "limit": 500}), headers=H)
        for it2 in json.loads(res2) if st2 == 200 else []:
            full = pfx + it2["name"]
            if it2.get("id"):
                semua.append(full)
            else:
                print(f"  (subfolder dalam {pfx}: {it2['name']} — dilewati)")
print(f"total berkas nyata: {len(semua)}")
for n in semua:
    print("  *", n)
