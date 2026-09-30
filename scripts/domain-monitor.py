#!/usr/bin/env python3
"""Monitor propagasi DNS & sertifikat SSL rekom.mukminnasri.com (Tahap 3 deploy E-REKOM)."""
import subprocess, time, datetime, json, os

DOMAIN = "rekom.mukminnasri.com"
LOG = "/home/z/my-project/domain-monitor.log"
RESOLVERS = ["dnsx1.domainesia.com", "dnsx2.domainesia.com", "dnsx3.domainesia.com",
             "dnsx4.domainesia.com", "8.8.8.8", "1.1.1.1"]

def sh(cmd):
    try:
        return subprocess.run(cmd, shell=True, capture_output=True, text=True,
                              timeout=25).stdout.strip()
    except Exception as e:
        return f"ERR:{e}"

def snapshot():
    row = {"ts": datetime.datetime.now().isoformat(timespec="seconds")}
    for r in RESOLVERS:
        out = sh(f"dig +short CNAME {DOMAIN} @{r} | head -1")
        row[r.split('.')[0] if 'domainesia' in r else r] = out or "(kosong)"
    # HTTPS end-to-end — HARUS membedakan Vercel vs GitHub Pages lewat header server
    hdr = sh(f"curl -sI --max-time 15 https://{DOMAIN} | rg -i '^server:'")
    code = sh(f"curl -s -o /dev/null -w '%{{http_code}}' --max-time 15 https://{DOMAIN}")
    row["https"] = code or "ERR"
    row["server"] = hdr.split(":", 1)[1].strip() if ":" in hdr else "?"
    return row

def main():
    deadline = time.time() + 3 * 3600  # maksimum 3 jam
    while time.time() < deadline:
        s = snapshot()
        line = json.dumps(s, ensure_ascii=False)
        with open(LOG, "a") as f:
            f.write(line + "\n")
        # selesai bila resolver publik menunjuk vercel DAN https 200 dari server Vercel
        ok_dns = s.get("8.8.8.8") == "cname.vercel-dns.com." and s.get("1.1.1.1") == "cname.vercel-dns.com."
        ok_srv = "vercel" in s.get("server", "").lower()
        if ok_dns and ok_srv and s["https"] == "200":
            with open(LOG, "a") as f:
                f.write(json.dumps({"ts": s["ts"], "status": "LIVE_HTTPS_OK"}) + "\n")
            break
        time.sleep(60)

if __name__ == "__main__":
    main()
