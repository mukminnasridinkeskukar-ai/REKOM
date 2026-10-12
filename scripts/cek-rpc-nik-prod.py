#!/usr/bin/env python3
"""Cek apakah SQL pulih-dashboard + verifikasi NIK sudah dijalankan di produksi."""
import json, urllib.request

with open('/home/z/my-project/.smoke/prod-supabase.json') as f:
    cfg = json.load(f)
URL = cfg['url'].rstrip('/')
ANON = cfg['anonKey']

def rpc_test(fn, body):
    req = urllib.request.Request(
        f"{URL}/rest/v1/rpc/{fn}",
        data=json.dumps(body).encode(),
        headers={
            'apikey': ANON, 'Authorization': f'Bearer {ANON}',
            'Content-Type': 'application/json',
        }, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.read().decode()[:300]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]
    except Exception as e:
        return 0, str(e)[:200]

def rest_count(table):
    req = urllib.request.Request(
        f"{URL}/rest/v1/{table}?select=*",
        headers={'apikey': ANON, 'Authorization': f'Bearer {ANON}',
                 'Range': '0-0', 'Prefer': 'count=exact'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            cr = r.headers.get('content-range', 'x')
            return cr.split('/')[-1] if '/' in cr else '?'
    except urllib.error.HTTPError as e:
        return f"ERR {e.code}"

print("=== RPC verifikasi NIK (butuh SQL supabase-pulih-dashboard-verifikasi-nik.sql) ===")
st, body = rpc_test('rekom_verifikasi_nik', {'p_nik': '0000000000000000'})
print(f"rekom_verifikasi_nik -> HTTP {st}: {body}")

print("\n=== Jumlah baris tabel utama (anon RLS) ===")
for t in ['pengajuan', 'pengguna', 'tinjauan']:
    print(f"{t}: {rest_count(t)}")
