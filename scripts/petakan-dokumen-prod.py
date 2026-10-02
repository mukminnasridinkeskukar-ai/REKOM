#!/usr/bin/env python3
"""Petakan dokumen_pendukung <-> objek storage tmp/:
- baris file_url 'tmp/...'  -> berkas ADA, tinggal pindah ke folder pemohon
- baris file_url '/api/files/...' -> warisan mati; coba padankan dgn berkas tmp/ (waktu+ekstensi)
- berkas tmp/ tanpa rujukan -> orphan
"""
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone

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


def login(email):
    st, res = req(f"{URL}/auth/v1/token?grant_type=password", "POST",
                  json.dumps({"email": email, "password": "demo1234"}))
    if st != 200:
        raise SystemExit(f"login {email} gagal: {st} {res[:120]}")
    return json.loads(res)["access_token"]


tok = login("superadmin@dinkes.go.id")
H = {"Authorization": f"Bearer {tok}"}

st, res = req(f"{URL}/rest/v1/pengajuan_rekom?select=id,pemohon_id,judul_pengajuan,status,created_at", "GET", headers=H)
print("pengajuan:", st)
pgs = json.loads(res) if st == 200 else []
uids = sorted({p["pemohon_id"] for p in pgs})
st, res = req(f"{URL}/rest/v1/profiles?id=in.({','.join(uids)})&select=id,nama_lengkap,role", "GET", headers=H)
nama = {p["id"]: p.get("nama_lengkap", "?") for p in json.loads(res)} if st == 200 else {}
for p in pgs:
    print(f"  - {p['id'][:8]} [{p.get('status')}] {nama.get(p['pemohon_id'],'?')} :: {p.get('judul_pengajuan')}")

st, res = req(f"{URL}/rest/v1/dokumen_pendukung?select=id,pengajuan_id,nama_dokumen,file_url,tipe_file,ukuran,created_at&order=created_at.asc", "GET", headers=H)
print("\ndokumen_pendukung:", st)
docs = json.loads(res) if st == 200 else []
for d in docs:
    ms = datetime.fromisoformat(d["created_at"].replace("Z", "+00:00")).timestamp() * 1000
    d["_ms"] = ms
    print(f"  - {d['id'][:8]} pg={d['pengajuan_id'][:8]} ms={int(ms)} ukuran={d.get('ukuran')} "
          f"tipe={d.get('tipe_file')[:24]}")
    print(f"      nama={d.get('nama_dokumen')!r}")
    print(f"      file_url={d.get('file_url')!r}")

print("\nobjek storage tmp/:")
st, res = req(f"{URL}/storage/v1/object/list/dokumen-rekom", "POST",
              json.dumps({"prefix": "tmp/", "limit": 500}), headers=H)
files = []
for it in json.loads(res) if st == 200 else []:
    full = "tmp/" + it["name"]
    md = it.get("metadata") or {}
    ts = int(it["name"].split("-", 1)[0]) if it["name"].split("-", 1)[0].isdigit() else None
    files.append({"path": full, "ts": ts, "size": md.get("size"), "ct": md.get("contenttype") or md.get("contentType")})
    print(f"  * ts={ts} size={md.get('size')} ct={md.get('contenttype') or md.get('contentType')}")
    print(f"      {full}")

print("\n=== PADANAN (warisan -> tmp) ===")
klaim = {}
for f in files:
    if f["ts"] is None:
        continue
    cands = [d for d in docs if d["file_url"].startswith("/api/files/")
             and abs(d["_ms"] - f["ts"]) < 600_000]
    if cands:
        d = min(cands, key=lambda d: abs(d["_ms"] - f["ts"]))
        if d["id"] not in klaim:
            klaim[d["id"]] = f
            print(f"  {d['id'][:8]} ({int(d['_ms'])}) <-> {f['path'][:70]} (beda {int(d['_ms']-f['ts'])}ms)")

print("\n=== RINGKASAN ===")
n_legacy = sum(1 for d in docs if d["file_url"].startswith("/api/files/"))
n_tmp = sum(1 for d in docs if d["file_url"].startswith("tmp/"))
n_lain = len(docs) - n_legacy - n_tmp
print(f"dokumen total={len(docs)} | warisan /api/files/={n_legacy} | tmp/ (hidup)={n_tmp} | lain={n_lain}")
print(f"objek tmp/={len(files)} | terpadankan ke warisan={len(klaim)}")
tersangkut = [f["path"] for f in files if f["path"] not in {x["path"] for x in klaim.values()} and f["path"] not in {d["file_url"] for d in docs}]
print(f"objek tmp/ tak dirujuk dokumen mana pun: {len(tersangkut)}")
