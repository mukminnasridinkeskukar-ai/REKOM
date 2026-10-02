#!/usr/bin/env python3
"""Selamatkan berkas pemohon lama yang byte-nya masih ada di storage (folder tmp/).

Latar: sebelum perbaikan, FileUploader mengunggah ke tmp/ atau {pengajuanId}/,
namun baris dokumen_pendukung tertimpa path /api/files/{uuid} (bug unggah ganda
versi lama) sehingga pratinjau 410. Analisis menunjukkan byte nyata MASIH ADA
di tmp/ — dipadankan dengan baris dokumen lewat: pengajuan + ekstensi + urutan
waktu unggah vs waktu simpan + kesamaan nama.

Mode:
  python3 selamatkan-berkas-prod.py cek    -> tampilkan rencana saja
  python3 selamatkan-berkas-prod.py jalan  -> pindahkan objek + perbarui baris DB
"""
import json
import sys
import urllib.request
import urllib.error

info = json.load(open("/home/z/my-project/.smoke/prod-supabase.json"))
URL, ANON = info["url"], info["anonKey"]
BUCKET = "dokumen-rekom"

# Pemetaan final (hasil analisis forensik waktu+nama+ekstensi):
# doc-id-prefix -> (tmp-path, alasan)
RENCANA = {
    # --- Pengajuan Dhinda (aktif: disetujui_kabid) — unggahan 2,5 mnt sebelum simpan ---
    "606eb512": ("tmp/1790841657927-ktp.jpeg", "KTP: nama+ekstensi jpeg, 149s sebelum baris dibuat"),
    "766af7cf": ("tmp/1790841727597-SURAT AKTIF KULIAH DHINDA FK UPR.pdf", "Aktif Kuliah: nama persis, 84s"),
    "53fddc51": ("tmp/1790841769884-SURAT PERNYATAAN KOMITMEN CALON PESERTA.pdf", "Komitmen: nama persis, 50s"),
    "50fbdd8d": ("tmp/1790841788025-SURAT-PERNYATAAN-PENDAYAGUNAAN-Dhinda Kartika Putri.pdf", "Pendayagunaan: nama persis, 32s"),
    # --- Pengajuan Margareta (draft) — unggahan 3-4 mnt sebelum simpan ---
    "feb0326b": ("tmp/1790844351073-AKTIF KULIAH FK UPR.pdf", "Aktif Kuliah: nama persis, 247s"),
    "da82c2e8": ("tmp/1790844412191-IMG-20250620-WA0041.jpg", "KTP: satu-satunya jpg, 161s"),
    # --- Pengajuan Margareta (diajukan) — berkas dipakai ulang (ukuran byte identik dgn draft),
    #     diunggah 71-82 mnt sebelum simpan; pola kausalitas: semua unggah PRA-simpan ---
    "d53a688d": ("tmp/1790848073497-IMG-20250620-WA0041.jpg", "KTP: byte identik dgn KTP draft, satu-satunya jpg tersisa"),
    "6211cbf7": ("tmp/1790848342902-AKTIF KULIAH FK UPR.pdf", "Aktif Kuliah: byte identik dgn draft, satu-satunya pdf tersisa"),
    "cf96cc7e": ("tmp/1790848611400-SURAT-PERNYATAAN-PENDAYAGUNAAN-KUKAR-3515044412050001 (1).docx", "Pendayagunaan: nama persis, satu-satunya docx"),
    "fc5fda6d": ("tmp/1790852944033-signed_505628114149613_6abe24dc560c3_b498-01a0-0e4c-d7fa-0609-c47e-209.pdf", "Komitmen bermaterai: pindaian bertanda tangan (signed_), 31s sebelum simpan"),
}
# df9a646c (draft, Pendayagunaan.docx): tidak ada kandidat yakin -> tetap 410,
# pemohon dapat unggah ulang lewat menu Perbaiki Pengajuan.

MIME = {
    ".pdf": "application/pdf",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
}

BULAN = []  # log hasil


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


def bersih_nama(nama):
    import re
    b = re.sub(r"[^a-zA-Z0-9 .\-]", "", nama or "Pemohon").strip()
    b = re.sub(r"\s+", "-", b)
    b = re.sub(r"-+", "-", b).strip("-")[:60].strip("-")
    return b or "Pemohon"


tok = login("superadmin@dinkes.go.id")
H = {"Authorization": f"Bearer {tok}"}

# --- data dasar ---
st, res = req(f"{URL}/rest/v1/pengajuan_rekom?select=id,pemohon_id", "GET", headers=H)
pgs = {p["id"]: p for p in json.loads(res)}
uids = sorted({p["pemohon_id"] for p in pgs.values()})
st, res = req(f"{URL}/rest/v1/profiles?id=in.({','.join(uids)})&select=id,nama_lengkap", "GET", headers=H)
prof = {p["id"]: p for p in json.loads(res)}
st, res = req(f"{URL}/rest/v1/dokumen_pendukung?select=id,pengajuan_id,nama_dokumen,file_url,tipe_file,ukuran&order=created_at.asc", "GET", headers=H)
docs = json.loads(res)

mode = sys.argv[1] if len(sys.argv) > 1 else "cek"
print(f"MODE: {mode}\n")

sukses, gagal = 0, 0
for d in docs:
    did = d["id"]
    pre = did[:8]
    if pre not in RENCANA:
        print(f"[LEWAT] {pre} {d['nama_dokumen']!r} — tanpa padanan yakin (tetap 410, unggah ulang via Perbaiki)")
        continue
    src, alasan = RENCANA[pre]
    pg = pgs[d["pengajuan_id"]]
    pf = prof[pg["pemohon_id"]]
    folder = f"{bersih_nama(pf['nama_lengkap'])}--{pf['id'].replace('-', '')[:8]}"
    base = src.split("/", 1)[1]
    dest = f"{folder}/{d['pengajuan_id']}/{base}"
    akhir = base.rsplit(".", 1)[1].lower() if "." in base else ""
    ext = f".{akhir}" if akhir.isalnum() and len(akhir) <= 5 else ""
    mime = MIME.get(ext, d.get("tipe_file") or "application/octet-stream")
    print(f"[RENCANA] {pre} {d['nama_dokumen']!r}")
    print(f"    sumber : {src}")
    print(f"    tujuan : {dest}")
    print(f"    dasar  : {alasan}")
    print(f"    tipe   : {mime}")
    if mode != "jalan":
        continue
    # 1) pindahkan objek
    st, res = req(f"{URL}/storage/v1/object/move", "POST",
                  {"bucketId": BUCKET, "sourceKey": src, "destinationKey": dest}, headers=H)
    if st != 200:
        print(f"    GAGAL pindah: {st} {res[:140]}")
        gagal += 1
        continue
    # 2) ambil ukuran objek tujuan utk kolom ukuran
    st2, res2 = req(f"{URL}/storage/v1/object/list/{BUCKET}", "POST",
                    json.dumps({"prefix": dest, "limit": 5}), headers=H)
    ukuran = 0
    for it in json.loads(res2) if st2 == 200 else []:
        if (it.get("metadata") or {}).get("size"):
            ukuran = it["metadata"]["size"]
            break
    # 3) perbarui baris dokumen
    st3, res3 = req(f"{URL}/rest/v1/dokumen_pendukung?id=eq.{did}", "PATCH",
                    {"file_url": dest, "tipe_file": mime, "ukuran": ukuran}, headers=H)
    if st3 in (200, 204):
        print(f"    OK — objek dipindah, baris diperbarui (ukuran={ukuran})")
        sukses += 1
        BULAN.append({"id": did, "path_lama": d["file_url"], "path_baru": dest})
    else:
        print(f"    GAGAL update DB: {st3} {res3[:140]}")
        gagal += 1

print(f"\nSELESAI: sukses={sukses} gagal={gagal} (mode={mode})")
if mode == "jalan":
    json.dump(BULAN, open("/home/z/my-project/.smoke/hasil-selamatkan.json", "w"), indent=1)
    print("log: .smoke/hasil-selamatkan.json")
