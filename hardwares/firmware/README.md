# UNIHIKER K10 多模态固件

短按 A 拍照获得夸夸，长按 A（800 ms）录制三秒语音对话；短按 B 播放拥抱动画，长按 B 重连 Wi-Fi。媒体只在 RAM 中保留至请求完成。

首次联网时固件使用 Bootstrap Device Token 轮换凭证并将新 Token 写入 NVS；后续启动使用 NVS。NVS 当前未加密，量产时应启用 ESP32 Flash Encryption。

```bash
export K10_WIFI_SSID='...'
export K10_WIFI_PASSWORD='...'
export K10_BOOTSTRAP_DEVICE_ID='...'
export K10_BOOTSTRAP_TOKEN='...'
platformio run -t upload
```

也可运行 `./set-k10-env.sh --flash`。`flash-k10.sh` 默认使用 `/dev/cu.usbmodem11101`，可通过 `K10_PORT` 覆盖；恢复出厂设备可提供 `K10_ACTIVATION_CODE`。接口与验收见 [固件规格](docs/specs/k10-multimodal.md)。
