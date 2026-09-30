#!/usr/bin/env python3
"""Uji alur lengkap E-REKOM di PRODUKSI (rekom.mukminnasri.com).
Pemakaian:
  python3 e2e-prod-test.py probe          -> cek akun mana yang bisa login (demo1234)
  python3 e2e-prod-test.py full           -> jalankan alur lengkap end-to-end
"""
import json
import sys
import urllib.request
import urllib.error

BASE = "https://rekom.mukminnasri.com"

AKUN = [
    "pemohon@dinkes.go.id",
    "verifikator.sdmk@dinkes.go.id",
    "verifikator.yankes@dinkes.go.id",
    "verifikator.farmalkes@dinkes.go.id",
    "admin.tu@dinkes.go.id",
    "kabid@dinkes.go.id",
    "kadis@dinkes.go.id",
    "superadmin@dinkes.go.id",
]


def req(method: str, path: str, cookie: str | None = None, body: dict | None = None):
    headers = {}
    if cookie:
        headers["Cookie"] = cookie
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    r = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as res:
            raw = res.read()
            ctype = res.headers.get("Content-Type", "")
            sc = res.headers.get("Set-Cookie", "")
            if "application/pdf" in ctype:
                return res.status, b"[PDF %d bytes]" % len(raw), sc
            try:
                return res.status, json.loads(raw.decode()), sc
            except Exception:
                return res.status, raw.decode(errors="replace")[:200], sc
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try:
            return e.code, json.loads(raw), ""
        except Exception:
            return e.code, raw[:200], ""
    except Exception as e:
        return 0, f"{type(e).__name__}: {e}", ""


def login(email: str, password: str = "demo1234") -> tuple[int, str]:
    st, _, sc = req("POST", "/api/auth/login", body={"email": email, "password": password})
    if st == 200:
        return st, sc.split(";")[0]
    return st, ""


def probe() -> None:
    print(f"Probe akun di {BASE} (password: demo1234)\n")
    ok_list = []
    for email in AKUN:
        st, c = login(email)
        tanda = "OK " if st == 200 else "GAGAL"
        print(f"  [{tanda}] {email:40s} -> HTTP {st}")
        if st == 200:
            ok_list.append(email)
    print(f"\nTotal akun siap: {len(ok_list)}/{len(AKUN)}")


def full() -> None:
    # 1. pemohon: lihat jenis & buat draft
    st, c_pemohon = login("pemohon@dinkes.go.id")
    assert st == 200, f"login pemohon gagal: HTTP {st}"
    st, jenis, _ = req("GET", "/api/jenis", c_pemohon)
    assert st == 200 and jenis.get("data"), f"GET /api/jenis gagal: {st} {str(jenis)[:120]}"
    daftar = jenis["data"]
    print(f"1. login pemohon OK; {len(daftar)} jenis rekomendasi tersedia")

    # 2. buat + ajukan (SIP-DMK, bidang SDMK)
    jenis_sip = next((j for j in daftar if j.get("kodeJenis") == "SIP-DMK"), daftar[0])
    st, resp, _ = req("POST", "/api/pengajuan", c_pemohon, {
        "jenisId": jenis_sip["id"],
        "judulPengajuan": "UJI COBA Sistem E2E (boleh dihapus)",
        "dataFormJson": json.dumps({
            "nama_tenaga_kesehatan": "dr. Uji Coba Sistem",
            "profesi": "Dokter Umum",
            "no_str": "STR-UJI-2026",
            "masa_berlaku_str": "2030-01-01",
            "tempat_praktik": "Klinik Uji Coba",
            "alamat_praktik": "Jl. Uji No. 1, Tenggarong",
        }),
    })
    assert st == 201, f"buat pengajuan gagal: {st} {str(resp)[:150]}"
    pid = resp["data"]["id"]
    print(f"2. pengajuan dibuat: {str(pid)[:14]}... OK")

    st, resp, _ = req("POST", f"/api/pengajuan/{pid}/action", c_pemohon, {"action": "submit"})
    assert st == 200, f"submit gagal: {st} {str(resp)[:120]}"
    print("3. diajukan (menunggu verifikasi) OK")

    # 3. verifikator SDMK verifikasi
    st, c_sdmk = login("verifikator.sdmk@dinkes.go.id")
    assert st == 200, "login verifikator.sdmk gagal"
    st, resp, _ = req("POST", f"/api/pengajuan/{pid}/action", c_sdmk, {"action": "verifikasi"})
    assert st == 200, f"verifikasi gagal: {st} {str(resp)[:120]}"
    print("4. diverifikasi bidang SDMK OK")

    # 4. kabid setujui
    st, c_kabid = login("kabid@dinkes.go.id")
    assert st == 200, "login kabid gagal"
    st, resp, _ = req("POST", f"/api/pengajuan/{pid}/action", c_kabid, {"action": "setujui"})
    assert st == 200, f"setujui gagal: {st} {str(resp)[:120]}"
    print("5. disetujui Kabid OK")

    # 5. admin TU beri nomor
    st, c_tu = login("admin.tu@dinkes.go.id")
    assert st == 200, "login admin.tu gagal"
    st, resp, _ = req("POST", f"/api/pengajuan/{pid}/action", c_tu, {"action": "beri_nomor"})
    assert st == 200, f"beri_nomor gagal: {st} {str(resp)[:120]}"
    nomor = resp["data"]["nomorSurat"]
    print(f"6. nomor surat otomatis: {nomor}")

    # 6. kadis terbitkan
    st, c_kadis = login("kadis@dinkes.go.id")
    assert st == 200, "login kadis gagal"
    st, resp, _ = req("POST", f"/api/pengajuan/{pid}/action", c_kadis, {"action": "terbitkan"})
    assert st == 200, f"terbitkan gagal: {st} {str(resp)[:120]}"
    qr = resp["data"].get("qrCodeId", "")
    print(f"7. DITERBITKAN Kadis; QR: {str(qr)[:10]}...")

    # 7. PDF publik via QR
    st, resp, _ = req("GET", f"/api/pengajuan/{pid}/pdf?qr={qr}")
    pdf_ok = st == 200
    print(f"8. PDF publik via QR: {'OK' if pdf_ok else f'GAGAL HTTP {st}'}")

    # 8. halaman verifikasi publik
    st, resp, _ = req("GET", f"/verifikasi/{qr}")
    print(f"9. halaman /verifikasi: HTTP {st}")

    # 9. notifikasi pemohon
    st, resp, _ = req("GET", "/api/notifications", c_pemohon)
    unread = resp.get("unread", "?") if isinstance(resp, dict) else "?"
    print(f"10. notifikasi pemohon (belum dibaca): {unread}")

    print("\n=== ALUR LENGKAP SAMPAI TERBIT: SELESAI ===")
    print(f"ID pengajuan uji: {pid}")
    print("(Data uji ini bisa dihapus dari dashboard Super Admin bila perlu)")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "probe"
    if mode == "full":
        full()
    else:
        probe()
