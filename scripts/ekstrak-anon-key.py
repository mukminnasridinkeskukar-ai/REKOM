#!/usr/bin/env python3
"""Ekstrak anon key dari semua chunk JS produksi (sitemap via _buildManifest)."""
import base64
import json
import re
import urllib.request

BASE = "https://rekom.mukminnasri.com"

visited = set()
queue = []
url_found = None
key_found = None


def fetch(u):
    return urllib.request.urlopen(u, timeout=30).read().decode(errors="replace")


def scan_js(js, src):
    global url_found, key_found
    if url_found is None:
        m = re.search(r'https://[a-z0-9]{20}\.supabase\.co', js)
        if m:
            url_found = m.group(0)
            print("URL:", url_found, "<-", src)
    if key_found is None:
        for m in re.finditer(r'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', js):
            try:
                payload = m.group(0).split(".")[1]
                payload += "=" * (-len(payload) % 4)
                pl = json.loads(base64.urlsafe_b64decode(payload))
                if pl.get("role") == "anon":
                    key_found = m.group(0)
                    print("ANON KEY:", key_found[:30] + "...", "<-", src)
                    break
            except Exception:
                pass
    # chunk lain yang direferensikan
    return re.findall(r'static/chunks/[A-Za-z0-9._-]+\.js', js)


for page in ["/", "/login", "/daftar"]:
    try:
        html = fetch(BASE + page)
    except Exception as e:
        print(page, "gagal:", e)
        continue
    queue += re.findall(r'src="(/_next/static/[^"]+\.js)"', html)
    inline = re.findall(r'<script[^>]*>(.*?)</script>', html, re.S)
    for js in inline:
        scan_js(js, f"inline:{page}")

seen = set()
while queue and not (url_found and key_found):
    s = queue.pop(0)
    if s in seen:
        continue
    seen.add(s)
    try:
        js = fetch(BASE + s)
    except Exception:
        continue
    queue += [f"/_next/{c}" for c in scan_js(js, s)]

print()
print("HASIL:")
print("SUPABASE_URL =", url_found)
print("ANON_KEY =", "DITEMUKAN" if key_found else None)
if url_found and key_found:
    json.dump({"url": url_found, "anonKey": key_found},
              open("/home/z/my-project/.smoke/prod-supabase.json", "w"))
    print("tersimpan ke .smoke/prod-supabase.json")
