#!/usr/bin/env python3
"""Diagnostik produksi: login sebagai superadmin & pemohon, cek /api/pengajuan + statistik."""
import json
import urllib.request
import urllib.error
import http.cookiejar

BASE = "https://rekom.mukminnasri.com"
JAR = http.cookiejar.CookieJar()
OPENER = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(JAR))


def call(method: str, path: str, body: dict | None = None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    data = json.dumps(body).encode() if body else None
    try:
        with OPENER.open(req, data=data, timeout=45) as r:
            raw = r.read().decode()
            try:
                return r.status, json.loads(raw)
            except Exception:
                return r.status, raw[:300]
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw[:300]
    except Exception as e:
        return 0, f"EXC: {e}"


def login_then_check(email: str, pw: str):
    print(f"\n===== LOGIN {email} =====")
    s, j = call("POST", "/api/auth/login", {"email": email, "password": pw})
    print("login:", s, str(j)[:200])
    if s != 200:
        return
    s, j = call("GET", "/api/pengajuan")
    print("/api/pengajuan:", s)
    if s == 200 and isinstance(j, dict):
        d = j.get("data", [])
        print("  jumlah pengajuan:", len(d))
        for p in d[:5]:
            print("   -", p.get("id", "")[:8], "|", p.get("status"), "|", (p.get("judulPengajuan") or "")[:40])
    else:
        print("  respons:", str(j)[:400])
    s, j = call("GET", "/api/jenis")
    print("/api/jenis:", s, "jumlah:", len(j.get("data", [])) if isinstance(j, dict) and s == 200 else str(j)[:200])
    s, j = call("GET", "/api/auth/me")
    print("/api/auth/me:", s, str(j)[:160])


login_then_check("superadmin@dinkes.go.id", "demo1234")
login_then_check("pemohon@dinkes.go.id", "demo1234")
