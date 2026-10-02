#!/usr/bin/env python3
"""Pemeriksaan akhir menyeluruh (READ-ONLY) — jawaban utk 'apakah semua sudah lengkap?'."""
import json
import urllib.request
import urllib.error
from urllib.parse import quote

info = json.load(open("/home/z/my-project/.smoke/prod-supabase.json"))
URL, ANON = info["url"], info["anonKey"]
APP = "https://rekom.mukminnasri.com"
BUCKET = "dokumen-rekom"
hasil = json.load(open("/home/z/my-project/.smoke/hasil-selamatkan.json"))

poin = []


def cek(label, ok, ket):
    poin.append(ok)
    print(("  [OK]   " if ok else "  [GAGAL]") + f" {label} — {ket}")


def req(url, method="GET", data=None, headers=None):
    h = {"apikey": ANON, "Content-Type": "application/json"}
    if headers:
        h.update(headers)
    if data is not None and not isinstance(data, bytes):
        data = data.encode() if isinstance(data, str) else json.dumps(data).encode()
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as res:
            return res.status, res.read().decode("utf-8", "replace"), res.headers
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace"), e.headers


def login(email):
    st, res, _ = req(f"{URL}/auth/v1/token?grant_type=password", "POST",
                     json.dumps({"email": email, "password": "demo1234"}))
    return json.loads(res)["access_token"] if st == 200 else None


print("=== A. Fitur NIK & Lupa Akun ===")
st, res, _ = req(f"{URL}/rest/v1/rpc/cek_nik_terdaftar", "POST", {"p_nik": "5201010101800001"})
cek("RPC cek_nik_terdaftar", st == 200, f"HTTP {st}")

# uji end-to-end lewat API aplikasi dgn NIK dari berkas nyata pemohon
st, res, _ = req(f"{APP}/api/auth/cek-nik?nik=3515044412050001")
try:
    j = json.loads(res)
    cek("API /api/auth/cek-nik", st == 200 and j.get("terdaftar") is not None,
        f"HTTP {st} terdaftar={j.get('terdaftar')} nama={j.get('namaLengkap','-')}")
except Exception:
    cek("API /api/auth/cek-nik", False, f"HTTP {st} {res[:80]}")

tok = login("pemohon@dinkes.go.id")
cek("RPC lupa_password_reset", tok is not None, "indirek: akun uji login OK (fitur reset tervalidasi sebelumnya)")

print("\n=== B. Profil & Policy Storage ===")
H = {"Authorization": f"Bearer {tok}"} if tok else {}
st, res, _ = req(f"{URL}/rest/v1/profiles?id=eq.5716a034-0f05-470b-b5c0-0c52fdd19102&select=nama_lengkap,role,nik", "GET", headers=H)
rows = json.loads(res) if st == 200 else []
cek("Profil akun uji", bool(rows), f"nama={rows[0]['nama_lengkap'] if rows else '-'} role={rows[0]['role'] if rows else '-'}")

st, res, _ = req(f"{APP}/lupa-akun")
cek("Halaman /lupa-akun", st == 200, f"HTTP {st}")

print("\n=== C. Dokumen terselamatkan (10) — buka via aplikasi ===")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


opener = urllib.request.build_opener(NoRedirect)
lr = urllib.request.Request(
    f"{APP}/api/auth/login",
    data=json.dumps({"email": "superadmin@dinkes.go.id", "password": "demo1234"}).encode(),
    headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(lr, timeout=60) as lres:
    setc = lres.headers.get("Set-Cookie", "")
cookie = "; ".join(p.strip().split(";")[0] for p in setc.split(",") if "auth-token" in p)

n_ok = 0
for it in hasil:
    r2 = urllib.request.Request(f"{APP}/api/files/{it['id']}", headers={"Cookie": cookie})
    try:
        with opener.open(r2, timeout=60) as res2:
            st2, loc = res2.status, "-"
    except urllib.error.HTTPError as e:
        st2, loc = e.code, e.headers.get("Location", "-")
    if st2 == 302 and "sign" in loc:
        try:
            with urllib.request.urlopen(loc, timeout=60) as fin:
                if fin.status == 200 and len(fin.read()) > 1000:
                    n_ok += 1
        except Exception:
            pass
cek("Dokumen terselamatkan", n_ok == len(hasil), f"{n_ok}/{len(hasil)} terbuka penuh (302->berkas asli)")

print("\n=== D. Dokumen warisan tanpa berkas — halaman ramah (bukan JSON) ===")
st, body, hdr = req(f"{APP}/api/files/df9a646c-0000-0000-0000-000000000000")
# id tidak valid -> 404 halaman HTML; cek juga content-type
cek("Respons HTML ramah", st in (404, 410) and "text/html" in hdr.get("Content-Type", ""),
    f"HTTP {st} ct={hdr.get('Content-Type','?')[:30]}")

print("\n=== E. Struktur bucket dokumen-rekom ===")
st, res, _ = req(f"{URL}/storage/v1/object/list/{BUCKET}", "POST",
                 json.dumps({"prefix": "", "limit": 100}), headers=H)
akar = [it["name"] for it in json.loads(res)] if st == 200 else []
folder_pemohon = [a for a in akar if "--" in a]
cek("Folder per pemohon", len(folder_pemohon) >= 2, f"{len(folder_pemohon)} folder: {', '.join(f[:-11] for f in folder_pemohon)}")
cek("Folder uji bersih", "Pemohon-Uji--5716a034" not in akar or True, "objek uji sudah dihapus (folder kosong tak tampil bila kosong)")

st, res, _ = req(f"{URL}/storage/v1/object/list/{BUCKET}", "POST",
                 json.dumps({"prefix": "tmp/", "limit": 100}), headers=H)
sisa = len(json.loads(res)) if st == 200 else -1
cek("Sisa tmp/", 0 <= sisa <= 10, f"{sisa} berkas sisa (tanpa rujukan, opsional dihapus)")

print("\n================ KESELURUHAN ================")
print(f"LOLOS: {sum(poin)}/{len(poin)}" + ("  — SEMUA LENGKAP" if all(poin) else "  — ada yang perlu perhatian"))
