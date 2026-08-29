# K10 Multimodal

UNIHIKER K10 firmware with two independent interactions: short-press A captures a photo for AI praise; long-press A records a three-second voice turn for AI conversation. B reconnects Wi-Fi.

The firmware keeps media in RAM only. On its first successful boot, it uses the environment-injected bootstrap device credential to rotate the backend Token and saves the replacement to NVS. Later boots use NVS directly.

Before the first build, set these local environment variables without putting their values in a file or chat: `K10_WIFI_SSID`, `K10_WIFI_PASSWORD`, `K10_BOOTSTRAP_DEVICE_ID`, and `K10_BOOTSTRAP_TOKEN`. Then run `platformio run -t upload` from this directory.
