#!/usr/bin/env python3
"""Buat akun uji standar E-REKOM di Supabase produksi (via Admin API service_role).
Akun yang sudah ada akan dilewati. Setelah itu set role & bidang di tabel profiles.
"""
import json
import os
import urllib.request
import urllib.error

BASE = "https://cbahdmzfsfeqdpqwemzq.supabase.co"
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

AKUN = [
    ("pemohon@dinkes.go.id",           "Pemohon Uji Dinkes",      "pemohon",            None),
    ("verifikator.sdmk@dinkes.go.id",  "Verifikator SDMK",        "verifikator_bidang", "SDMK"),
    ("verifikator.yankes@dinkes.go.id","Verifikator Yankes",      "verifikator_bidang", "Yankes"),
    ("verifikator.farmalkes@dinkes.go.id","Verifikator Farmalkes","verifikator_bidang", "Farmalkes"),
    ("admin.tu@dinkes.go.id",          "Admin Tata Usaha",        "admin_tu",           None),
    ("kabid@dinkes.go.id",             "Kabid Uji",               "kabid",              None),
    ("kadis@dinkes.go.id",             "Kepala Dinas Uji",        "kadis",              None),
    ("superadmin@dinkes.go.id",        "Super Admin Uji",         "super_admin",        None),
]

PW = "demo1234"


def http(method: str, url: str, payload: dict | None = None, apikey_header: bool = True):
    headers = {
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
    }
    if apikey_header:
        headers["apikey"] = KEY
    data = json.dumps(payload).encode() if payload is not None else None
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as res:
            raw = res.read()
            try:
                return res.status, json.loads(raw.decode()) if raw else {}
            except Exception:
                return res.status, raw.decode(errors="replace")
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw


def main() -> None:
    print("== 1. Buat user auth (Admin API) ==")
    for email, nama, _, _ in AKUN:
        st, resp = http("POST", f"{BASE}/auth/v1/admin/users", {
            "email": email,
            "password": PW,
            "email_confirm": True,
            "user_metadata": {"nama_lengkap": nama},
        })
        if st in (200, 201):
            print(f"  [BUAT ] {email}")
        elif st == 422:
            print(f"  [ADA  ] {email} (sudah terdaftar, dilewati)")
        else:
            print(f"  [GAGAL] {email} -> HTTP {st}: {str(resp)[:120]}")

    print("\n== 2. Set role & bidang di profiles (PostgREST) ==")
    for email, _, role, bidang in AKUN:
        payload = {"role": role}
        if bidang:
            payload["bidang"] = bidang
        st, resp = http("PATCH", f"{BASE}/rest/v1/profiles?email=eq.{email}", payload)
        print(f"  [{'OK ' if st in (200, 204) else 'GAGAL'}] {email:40s} -> role={role}" + (f", bidang={bidang}" if bidang else "") + ("" if st in (200, 204) else f" HTTP {st}"))

    print("\n== 3. Verifikasi isi profiles ==")
    st, rows = http("GET", f"{BASE}/rest/v1/profiles?select=email,role,bidang&order=email.asc")
    if st == 200 and isinstance(rows, list):
        for r in rows:
            print(f"  {r.get('email','?'):40s} {r.get('role','?'):20s} {r.get('bidang') or '-'}")
    else:
        print(f"  GAGAL baca profiles: HTTP {st}")


if __name__ == "__main__":
    main()
