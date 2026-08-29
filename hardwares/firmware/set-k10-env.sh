#!/usr/bin/env zsh

run_flash=false
read_stdin=false
for argument in "$@"; do
  case "$argument" in
    --flash) run_flash=true ;;
    --stdin) read_stdin=true ;;
    *)
      echo "Usage: source ./set-k10-env.sh | ./set-k10-env.sh --stdin --flash" >&2
      return 2 2>/dev/null || exit 2
      ;;
  esac
done

if $read_stdin; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    [[ "$line" == '```'* ]] && continue
    [[ "$line" == K10_* ]] || continue
    key="${line%%=*}"
    value="${line#*=}"
    [[ "$key" != "$line" ]] || { echo "Invalid credential line" >&2; exit 2; }
    case "$key" in
      K10_WIFI_SSID) K10_WIFI_SSID="$value" ;;
      K10_WIFI_PASSWORD) K10_WIFI_PASSWORD="$value" ;;
      K10_BOOTSTRAP_DEVICE_ID) K10_BOOTSTRAP_DEVICE_ID="$value" ;;
      K10_BOOTSTRAP_TOKEN) K10_BOOTSTRAP_TOKEN="$value" ;;
      *) echo "Unsupported credential key: $key" >&2; exit 2 ;;
    esac
  done
else
  [[ -n "${K10_WIFI_SSID:-}" ]] || read -r "K10_WIFI_SSID?Wi-Fi SSID: "
  [[ -n "${K10_WIFI_PASSWORD:-}" ]] || { read -rs "K10_WIFI_PASSWORD?Wi-Fi password: "; echo; }
  [[ -n "${K10_BOOTSTRAP_DEVICE_ID:-}" ]] || read -r "K10_BOOTSTRAP_DEVICE_ID?Bootstrap device ID: "
  [[ -n "${K10_BOOTSTRAP_TOKEN:-}" ]] || { read -rs "K10_BOOTSTRAP_TOKEN?Bootstrap token: "; echo; }
fi

for key in K10_WIFI_SSID K10_WIFI_PASSWORD K10_BOOTSTRAP_DEVICE_ID K10_BOOTSTRAP_TOKEN; do
  [[ -n "${(P)key:-}" ]] || { echo "Missing credential: $key" >&2; exit 2; }
done

export K10_WIFI_SSID K10_WIFI_PASSWORD K10_BOOTSTRAP_DEVICE_ID K10_BOOTSTRAP_TOKEN
echo "K10 environment is set for this terminal."

$run_flash && exec ./flash-k10.sh
