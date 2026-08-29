#!/usr/bin/env python3
"""Reset the K10 over USB (1200bps touch) and capture ~18s of serial output."""
import sys
import time

import serial

PORT = "COM11"
CAPTURE_S = 18.0

# 1200bps touch triggers the ESP32-S3 USB-Serial/JTAG ROM reset
s = serial.Serial(PORT, 1200, timeout=1)
s.close()  # close at 1200 baud = reset on USB CDC/ACM devices
time.sleep(0.4)

cap = serial.Serial(PORT, 115200, timeout=1)
buf = b""
end = time.time() + CAPTURE_S
while time.time() < end:
    chunk = cap.read(4096)
    if chunk:
        buf += chunk
        sys.stdout.buffer.write(chunk)
        sys.stdout.buffer.flush()
cap.close()
open("reset_capture.txt", "wb").write(buf)
print(f"\n--- captured {len(buf)} bytes to reset_capture.txt ---", file=sys.stderr)