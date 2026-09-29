#!/usr/bin/env python3
"""Uji alur lengkap E-REKOM: pemohon -> verifikator -> kabid -> admin_tu -> kadis -> QR terbit."""
import json
import urllib.request
import urllib.error

BASE = "http://localhost:3000"


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
        with urllib.request.urlopen(r) as res:
            raw = res.read()
            ctype = res.headers.get("Content-Type", "")
            sc = res.headers.get("Set-Cookie", "")
            if "application/pdf" in ctype:
                return res.status, b"[PDF %d bytes]" % len(raw), sc
            try:
                return res.status, json.loads(raw.decode()), sc
            except Exception:
                return res.status, raw.decode(errors="replace"), sc
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try:
            return e.code, json.loads(raw), ""
        except Exception:
            return e.code, raw, ""


def login(email: str) -> str:
    st, _, sc = req("POST", "/api/auth/login", body={"email": email, "password": "demo1234"})
    assert st == 200, f"login {email} gagal: {st}"
    return sc.split(";")[0]


def main() -> None:
    # 1. pemohon: buat draft dengan jenis LAIN-LAIN
    c_pemohon = login("pemohon@dinkes.go.id")
    st, jenis, _ = req("GET", "/api/jenis")
    jenis_lain = next(j for j in jenis["data"] if j["kodeJenis"] == "LAIN-LAIN")
    st, resp, _ = req(
        "POST",
        "/api/pengajuan",
        c_pemohon,
        {
            "jenisId": jenis_lain["id"],
            "judulPengajuan": "Uji Workflow Otomatis E2E",
            "dataFormJson": json.dumps({"keperluan": "Pengujian sistem", "instansi_tujuan": "Dinkes Provinsi"}),
        },
    )
    assert st == 201, f"buat pengajuan gagal: {st} {resp}"
    pid = resp["data"]["id"]
    print(f"1. draft dibuat: {pid[:12]}... OK")

    # 2. pemohon: submit
    st, resp, _ = req("POST", f"/api/pengajuan/{pid}/action", c_pemohon, {"action": "submit"})
    assert st == 200, f"submit gagal: {resp}"
    print("2. diajukan OK")

    # 3. verifikator SDMK tidak berwenang pada pengajuan bidang lain -> harus ditolak
    c_sdmk = login("verifikator.sdmk@dinkes.go.id")
    st, _, _ = req("POST", f"/api/pengajuan/{pid}/action", c_sdmk, {"action": "verifikasi"})
    assert st in (400, 403), f"verifikator salah bidang justru bisa! {st}"
    print("3. verifikator beda bidang ditolak sistem OK")

    # 4. alur perbaikan dengan jenis SIP-DMK (bidang SDMK)
    jenis_sip = next(j for j in jenis["data"] if j["kodeJenis"] == "SIP-DMK")
    st, resp, _ = req(
        "POST",
        "/api/pengajuan",
        c_pemohon,
        {
            "jenisId": jenis_sip["id"],
            "judulPengajuan": "Uji Workflow SIP Dokter E2E",
            "dataFormJson": json.dumps({
                "nama_tenaga_kesehatan": "dr. Andi Saputra",
                "profesi": "Dokter Umum",
                "no_str": "STR-TEST-1",
                "masa_berlaku_str": "2030-01-01",
                "tempat_praktik": "Klinik Uji",
                "alamat_praktik": "Jl. Uji No. 1",
            }),
        },
    )
    pid2 = resp["data"]["id"]
    req("POST", f"/api/pengajuan/{pid2}/action", c_pemohon, {"action": "submit"})
    st, resp, _ = req("POST", f"/api/pengajuan/{pid2}/action", c_sdmk, {"action": "kembalikan", "catatan": "STR tidak terbaca"})
    assert st == 200, f"kembalikan gagal: {resp}"
    st, resp, _ = req("POST", f"/api/pengajuan/{pid2}/action", c_pemohon, {"action": "perbaiki"})
    assert st == 200, f"perbaiki gagal: {resp}"
    st, resp, _ = req("POST", f"/api/pengajuan/{pid2}/action", c_sdmk, {"action": "verifikasi"})
    assert st == 200, f"verifikasi gagal: {resp}"
    print("4. kembalikan -> perbaiki -> verifikasi OK")

    # 5. kabid setujui
    c_kabid = login("kabid@dinkes.go.id")
    st, resp, _ = req("POST", f"/api/pengajuan/{pid2}/action", c_kabid, {"action": "setujui"})
    assert st == 200, f"setujui gagal: {resp}"
    print("5. disetujui kabid OK")

    # 6. admin_tu beri nomor
    c_tu = login("admin.tu@dinkes.go.id")
    st, resp, _ = req("POST", f"/api/pengajuan/{pid2}/action", c_tu, {"action": "beri_nomor"})
    assert st == 200, f"beri_nomor gagal: {resp}"
    nomor = resp["data"]["nomorSurat"]
    print(f"6. nomor surat otomatis: {nomor} OK")
    assert nomor and nomor.startswith("440/"), "format nomor salah"

    # 7. kadis terbitkan
    c_kadis = login("kadis@dinkes.go.id")
    st, resp, _ = req("POST", f"/api/pengajuan/{pid2}/action", c_kadis, {"action": "terbitkan"})
    assert st == 200, f"terbitkan gagal: {resp}"
    qr = resp["data"]["qrCodeId"]
    print(f"7. terbit OK, QR: {str(qr)[:8]}...")

    # 8. verifikasi publik + PDF publik
    st, resp, _ = req("GET", f"/api/pengajuan/{pid2}")
    assert st == 401, "detail harus butuh login"
    st, resp, _ = req("GET", f"/api/pengajuan/{pid2}/pdf?qr={qr}")
    assert st == 200, f"PDF publik gagal: {st}"
    print("8. PDF publik via QR OK")

    # 9. pemohon lain tidak boleh melihat pengajuan bukan miliknya
    c_bidan = login("bidan@dinkes.go.id")
    st, resp, _ = req("GET", f"/api/pengajuan/{pid2}", c_bidan)
    assert st == 404, f"pemohon lain justru bisa lihat! {st}"
    print("9. isolasi data antar pemohon OK")

    # 10. notifikasi pemohon bertambah
    st, resp, _ = req("GET", "/api/notifications", c_pemohon)
    unread = resp.get("unread", 0)
    assert unread > 0, "notifikasi tidak muncul"
    print(f"10. notifikasi pemohon: {unread} belum dibaca OK")

    print("")
    print("=== SEMUA UJI ALUR WORKFLOW LULUS ===")


if __name__ == "__main__":
    main()
