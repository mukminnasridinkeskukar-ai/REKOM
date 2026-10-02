#!/usr/bin/env python3
"""Verifikasi menyeluruh pasca user menjalankan supabase-folder-pemohon.sql:
1. RPC cek_nik_terdaftar aktif? (anon)
2. RPC lupa_password_reset aktif? (anon, data dummy)
3. Login pemohon uji -> profil ada / lengkapi bila kosong
4. Storage: unggah folder SENDIRI harus BERHASIL
5. Storage: unggah folder ORANG harus DITOLAK (policy baru aktif)
6. Bersihkan objek uji
7. Tampilan isi bucket per folder
"""
import json
import time
import urllib.request
import urllib.error

info = json.load(open("/home/z/my-project/.smoke/prod-supabase.json"))
URL, ANON = info["url"], info["anonKey"]
PEMOHON = {"email": "pemohon@dinkes.go.id", "password": "demo1234"}

ok_rows = []
fail_rows = []


def lapor(label, ok, ket):
    (ok_rows if ok else fail_rows).append(f"{label}: {ket}")
    print(("  OK  " if ok else " GAGAL") + f" | {label} -> {ket}")


def req(url, method="GET", data=None, headers=None, form=False):
    h = {"apikey": ANON, "Content-Type": "application/json"}
    if headers:
        h.update(headers)
    if data is not None and not isinstance(data, bytes):
        data = data.encode() if isinstance(data, str) else json.dumps(data).encode()
    body = data if not form else urllib.parse.urlencode(data).encode()
    r = urllib.request.Request(url, data=body, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as res:
            return res.status, res.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


print("=== 1. RPC cek_nik_terdaftar ===")
st, res = req(f"{URL}/rest/v1/rpc/cek_nik_terdaftar", "POST",
              json.dumps({"p_nik": "5201010101800001"}))
if st == 200:
    lapor("RPC cek_nik_terdaftar", True, f"aktif ({res[:90]})")
else:
    lapor("RPC cek_nik_terdaftar", False, f"{st} {res[:90]}")

print("\n=== 2. RPC lupa_password_reset ===")
st, res = req(f"{URL}/rest/v1/rpc/lupa_password_reset", "POST",
              json.dumps({"p_nik": "9999999999999999",
                          "p_no_hp": "081234567890",
                          "p_password": "UjiHanya1234"}))
if st == 200 and '"ok":false' in res.replace(" ", ""):
    lapor("RPC lupa_password_reset", True, f"aktif ({res[:90]})")
else:
    lapor("RPC lupa_password_reset", False, f"{st} {res[:110]}")

print("\n=== 3. Login akun pemohon uji (Supabase Auth) ===")
st, res = req(f"{URL}/auth/v1/token?grant_type=password", "POST",
              json.dumps(PEMOHON))
if st != 200:
    lapor("Login pemohon", False, f"{st} {res[:120]}")
    raise SystemExit(1)
auth = json.loads(res)
tok, uid = auth["access_token"], auth["user"]["id"]
H = {"Authorization": f"Bearer {tok}"}
print(f"  OK   | login -> uid={uid}")

print("\n=== 3b. Profil pemohon uji ===")
st, res = req(f"{URL}/rest/v1/profiles?id=eq.{uid}&select=*", "GET", headers=H)
rows = json.loads(res) if st == 200 else []
if st == 200 and rows:
    lapor("Profil pemohon", True, f"ada: nama={rows[0].get('nama_lengkap')} role={rows[0].get('role')} nik={rows[0].get('nik')}")
else:
    ins = {"id": uid, "email": PEMOHON["email"], "nama_lengkap": "Pemohon Uji Dinkes",
           "role": "pemohon"}
    st2, res2 = req(f"{URL}/rest/v1/profiles", "POST", json.dumps(ins),
                    headers={**H, "Prefer": "return=representation"})
    if st2 in (200, 201):
        lapor("Profil pemohon", True, "sebelumnya KOSONG -> berhasil dilengkapi via policy 'insert sendiri'")
    else:
        lapor("Profil pemohon", False, f"gagal melengkapi: {st2} {res2[:140]}")

print("\n=== 4. Storage: unggah di folder SENDIRI (harus berhasil) ===")
ts = int(time.time() * 1000)
own_path = f"Pemohon-Uji--{uid[:8]}/verif-policy/{ts}-tes-own.pdf"
st, res = req(f"{URL}/storage/v1/object/dokumen-rekom/{own_path}", "POST",
              b"%PDF-1.4 UJI-EREKOM", headers={**H, "Content-Type": "application/pdf"})
lapor("Unggah folder sendiri", st == 200, f"{st} {res[:90]}")

print("\n=== 5. Storage: unggah di folder ORANG (harus DITOLAK) ===")
st, res = req(f"{URL}/storage/v1/object/dokumen-rekom/00000000--deadbeef/verif-policy/{ts}-tes-lain.pdf",
              "POST", b"%PDF-1.4 UJI-LAIN", headers={**H, "Content-Type": "application/pdf"})
if st in (400, 401, 403):
    lapor("Unggah folder orang lain", True, f"DITOLAK sesuai policy baru ({st})")
elif st == 200:
    lapor("Unggah folder orang lain", False, "MASIH DITERIMA -> policy per-folder BELUM aktif (SQL belum dijalankan?)")
    req(f"{URL}/storage/v1/object/dokumen-rekom/00000000--deadbeef/verif-policy/{ts}-tes-lain.pdf",
        "DELETE", headers=H)
else:
    lapor("Unggah folder orang lain", False, f"{st} {res[:90]}")

print("\n=== 6. Bersihkan objek uji ===")
st, _ = req(f"{URL}/storage/v1/object/dokumen-rekom/{own_path}", "DELETE", headers=H)
lapor("Hapus objek uji", st in (200, 204), f"{st}")

print("\n=== 7. Isi bucket dokumen-rekom per folder ===")
st, res = req(f"{URL}/storage/v1/object/list/dokumen-rekom", "POST",
              json.dumps({"prefix": "", "limit": 1000, "offset": 0}),
              headers=H)
if st == 200:
    items = json.loads(res)
    folder = {}
    for it in items:
        name = it.get("name", "")
        f = name.split("/")[0] if "/" in name else "(akar)"
        folder[f] = folder.get(f, 0) + 1
    lapor("Daftar objek", True, f"{len(items)} objek")
    for f in sorted(folder):
        print(f"     - {f} : {folder[f]} berkas")
else:
    lapor("Daftar objek", False, f"{st} {res[:90]}")

print("\n================ RINGKASAN ================")
print(f"LOLOS : {len(ok_rows)} | GAGAL: {len(fail_rows)}")
for f in fail_rows:
    print("  !!", f)
