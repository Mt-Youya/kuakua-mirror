#!/usr/bin/env zsh
set -euo pipefail

readonly PIO="${PIO:-/Users/yonjay/.platformio/penv/bin/pio}"
readonly PORT="${K10_PORT:-/dev/cu.usbmodem11101}"

require_env() {
  local name="$1"
  [[ -n "${(P)name:-}" ]] || { echo "Missing environment variable: $name" >&2; exit 1; }
}

[[ -x "$PIO" ]] || { echo "PlatformIO not found: $PIO" >&2; exit 1; }
[[ -e "$PORT" ]] || { echo "K10 serial port not found: $PORT" >&2; exit 1; }

require_env K10_WIFI_SSID
require_env K10_WIFI_PASSWORD

if [[ -z "${K10_ACTIVATION_CODE:-}" ]]; then
  require_env K10_BOOTSTRAP_DEVICE_ID
  require_env K10_BOOTSTRAP_TOKEN
fi

"$PIO" run -t upload --upload-port "$PORT"
exec "$PIO" device monitor -p "$PORT" -b 115200
