#!/usr/bin/env python3
"""Migrasi berkas lama bucket dokumen-rekom ke folder per-pemohon.

Struktur baru: {Nama-Pemohon--id8}/{idPengajuan}/{sisa-path}
- Berkas lama ber-path /api/files/... (warisan hilang) DILEWATI (tidak bisa diselamatkan).
- Path yang sudah berada di folder pemohon yang benar DILEWATI (idempotent).

Pemakaian:
  python3 scripts/pindah-folder-pemohon.py cek    # hanya tampilkan rencana (tidak mengubah apa pun)
  python3 scripts/pindah-folder-pemohon.py jalan  # pindahkan berkas + perbarui catatan DB
"""
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

KONFIG = Path(".smoke/prod-supabase.json")
EMAIL = "superadmin@dinkes.go.id"
SANDI = "demo1234"


def folder_pemohon(nama: str, uid: str) -> str:
    """Harus MIRIP PERSIS dengan folderPemohon() di src/lib/upload-client.ts."""
    s = nama or "Pemohon"
    out = []
    for ch in s:
        if ch.isascii() and (ch.isalnum() or ch in " .-"):
            out.append(ch)
    s = ("".join(out)).strip()
    # spasi (dan sisa whitespace) -> strip, lalu rapikan strip beruntun
    s = "-".join(s.split())
    s = s.replace("--", "-")
    while "--" in s:
        s = s.replace("--", "-")
    s = s.strip("-")[:60].strip("-") or "Pemohon"
    return f"{s}--{str(uid).replace('-', '')[:8]}"


def http(method, url, payload=None, token=None, apikey=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if apikey:
        headers["apikey"] = apikey
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            raw = res.read().decode()
            return res.status, (json.loads(raw) if raw.strip() else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw[:200]


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "cek"
    if not KONFIG.exists():
        sys.exit("File .smoke/prod-supabase.json tidak ada. Jalankan scripts/ekstrak-anon-key.py dulu.")
    cfg = json.loads(KONFIG.read_text())
    url, anon = cfg["url"], cfg["anonKey"]

    # 1. login super admin
    st, res = http("POST", f"{url}/auth/v1/token?grant_type=password",
                   {"email": EMAIL, "password": SANDI})
    if st != 200:
        sys.exit(f"Login gagal: HTTP {st} {str(res)[:120]}")
    token = res["access_token"]
    print(f"[OK] Login {EMAIL}")

    # 2. ambil data
    st, profiles = http("GET", f"{url}/rest/v1/profiles?select=id,nama_lengkap", token=token, apikey=anon)
    st, pengajuan = http("GET", f"{url}/rest/v1/pengajuan_rekom?select=id,pemohon_id", token=token, apikey=anon)
    st, dokumen = http("GET", f"{url}/rest/v1/dokumen_pendukung?select=id,pengajuan_id,file_url,nama_dokumen", token=token, apikey=anon)
    map_pemohon = {p["id"]: p["nama_lengkap"] for p in profiles}
    map_jenis = {p["id"]: p["pemohon_id"] for p in pengajuan}
    print(f"[OK] {len(profiles)} profil, {len(pengajuan)} pengajuan, {len(dokumen)} dokumen")

    pindah, lewati, hilang = [], [], []
    for d in dokumen:
        fu = d["file_url"] or ""
        if fu.startswith(("/api/", "http", "demo:")):
            lewati.append((d, fu, "path warisan (/api/files) — tidak dapat diselamatkan"))
            continue
        pid = d["pengajuan_id"]
        pemohon_id = map_jenis.get(pid)
        if not pemohon_id:
            lewati.append((d, fu, "pengajuan/pemohon tidak ditemukan"))
            continue
        folder = folder_pemohon(map_pemohon.get(pemohon_id, "Pemohon"), pemohon_id)
        seg = fu.split("/")
        if seg[0] == folder:
            lewati.append((d, fu, "sudah di folder yang benar"))
            continue
        sisa = "/".join(seg[1:]) or seg[0]
        baru = f"{folder}/{pid}/{sisa}"
        pindah.append((d, fu, baru))

    print(f"\nRENCANA: {len(pindah)} berkas dipindah, {len(lewati)} dilewati\n")
    for d, lama, baru in pindah:
        print(f"  PINDAH  {d['nama_dokumen'][:34]:34s} {lama}\n     -> {baru}")
    for d, fu, alasan in lewati:
        print(f"  LEWATI  {d['nama_dokumen'][:34]:34s} {fu[:60]} ({alasan})")

    if mode != "jalan":
        print("\nMode 'cek' — tidak ada perubahan. Jalankan ulang dengan argumen 'jalan' untuk eksekusi.")
        return

    print("\n== EKSEKUSI ==")
    ok, gagal = 0, 0
    for d, lama, baru in pindah:
        st, res = http("POST", f"{url}/storage/v1/object/move",
                       {"bucketId": "dokumen-rekom", "sourceKey": lama, "destinationKey": baru},
                       token=token, apikey=anon)
        if st in (200, 201):
            st2, _ = http("PATCH", f"{url}/rest/v1/dokumen_pendukung?id=eq.{d['id']}",
                          {"file_url": baru}, token=token, apikey=anon)
            if st2 in (200, 204):
                print(f"  [OK ] {d['nama_dokumen'][:40]}")
                ok += 1
            else:
                print(f"  [DB GAGAL] {d['id']} HTTP {st2} — berkas sudah pindah, catatan DB gagal diperbarui")
                gagal += 1
        else:
            print(f"  [GAGAL] {d['nama_dokumen'][:40]} -> HTTP {st}: {str(res)[:100]}")
            gagal += 1
    print(f"\nSELESAI: {ok} pindah sukses, {gagal} gagal.")


if __name__ == "__main__":
    main()
