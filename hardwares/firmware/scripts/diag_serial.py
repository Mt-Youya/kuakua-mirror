#!/usr/bin/env python3
"""Diagnose: open COM11, watch 15s, send GO, watch 60s. Print every line."""
import sys
import time

import serial

PORT = "COM11"
ser = serial.Serial(PORT, 115200, timeout=1)
ser.setDTR(False)
ser.setRTS(False)
print("port opened; dt/rts reset. watching 15s...", flush=True)
end = time.time() + 15
while time.time() < end:
    raw = ser.readline()
    if raw:
        sys.stdout.write(raw.decode("utf-8", errors="replace"))
        sys.stdout.flush()
print("sending GO...", flush=True)
ser.write(b"GO\n")
ser.flush()
print("watching 60s...", flush=True)
end = time.time() + 60
while time.time() < end:
    raw = ser.readline()
    if raw:
        sys.stdout.write(raw.decode("utf-8", errors="replace"))
        sys.stdout.flush()
ser.close()
print("diagnose done", flush=True)