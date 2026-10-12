#!/usr/bin/env python3
"""Cek status produksi: RPC rekom_berkas_publik ada/tidak, bucket rekom-terbit, dst."""
import json
import urllib.request
import urllib.error

CFG = json.load(open("/home/z/my-project/.smoke/prod-supabase.json"))
URL, ANON = CFG["url"].rstrip("/"), CFG["anonKey"]


def rest(path: str, method="GET", body=None):
    req = urllib.request.Request(URL + path, method=method)
    req.add_header("apikey", ANON)
    req.add_header("Authorization", f"Bearer {ANON}")
    if body is not None:
        req.add_header("Content-Type", "application/json")
        data = json.dumps(body).encode()
    else:
        data = None
    try:
        with urllib.request.urlopen(req, data=data, timeout=30) as r:
            return r.status, r.read().decode()[:500]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:500]
    except Exception as e:
        return 0, f"EXC: {e}"


# 1. RPC rekom_berkas_publik dengan QR acak (harusnya 200 + null bila fungsi ada)
print("1) RPC rekom_berkas_publik:", rest("/rest/v1/rpc/rekom_berkas_publik", "POST", {"p_qr": "00000000-0000-0000-0000-000000000000"}))

# 2. RPC cek_nik_terdaftar (bukti SQL nik-akun sudah jalan)
print("2) RPC cek_nik_terdaftar:", rest("/rest/v1/rpc/cek_nik_terdaftar", "POST", {"p_nik": "0000000000000000"}))

# 3. Bucket rekom-terbit bisa dilihat publik?
print("3) List bucket rekom-terbit:", rest("/storage/v1/object/list/rekom-terbit", "POST", {"prefix": "", "limit": 5}))

# 4. Tabel pengajuan via anon (RLS -> harusnya [] / 200)
print("4) pengajuan_rekom via anon:", rest("/rest/v1/pengajuan_rekom?select=id&limit=1"))

# 5. profiles via anon (RLS -> harusnya [])
print("5) profiles via anon:", rest("/rest/v1/profiles?select=id&limit=1"))
