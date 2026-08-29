#!/usr/bin/env python3
"""Probe kuakua backend reachability & tts 403 cause."""
import json
import ssl
import sys
import urllib.request

API = "https://kuakua-api.cyrusdoyle.me"
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"


def get(url, headers):
    req = urllib.request.Request(url, headers=headers)
    try:
        r = urllib.request.urlopen(req, context=ctx, timeout=20)
        return r.status, r.read(200)
    except urllib.error.HTTPError as e:
        return e.code, e.read(300)
    except Exception as e:  # noqa: BLE001
        return None, str(e).encode()[:200]


status, body = get(API + "/api/health", {"User-Agent": UA, "Accept": "*/*"})
print("health:", status, body[:150])

# TTS with bootstrap credentials (from .env.local)
env = {}
for line in open(r"D:\黑客松Zcode\调试版代码kuakua-mirror-main\kuakua-mirror-main\hardwares\firmware\.env.local", encoding="utf-8"):
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

hdr = {
    "User-Agent": UA,
    "Accept": "application/json",
    "Content-Type": "application/json",
    "X-Device-ID": env["K10_BOOTSTRAP_DEVICE_ID"],
    "Authorization": "Bearer " + env["K10_BOOTSTRAP_TOKEN"],
}
body_bytes = json.dumps({"device_id": env["K10_BOOTSTRAP_DEVICE_ID"], "text": "抱抱你，辛苦啦"}).encode()
req = urllib.request.Request(API + "/api/v1/tts", data=body_bytes, headers=hdr)
try:
    r = urllib.request.urlopen(req, context=ctx, timeout=60)
    print("tts:", r.status, r.read(300))
except urllib.error.HTTPError as e:
    print("tts:", e.code, e.read(300))
except Exception as e:  # noqa: BLE001
    print("tts exception:", e)