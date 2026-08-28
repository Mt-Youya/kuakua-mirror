# 05: OTA 固件发布与检查

**What to build:** 开发者可内部发布不可变 FirmwareRelease；已激活 Device 仅能发现与其型号匹配、版本更高的 stable 固件，并获得安全下载信息。

**Blocked by:** 02: 设备激活与 Token 网关; 03: 私有制品存储接缝.

**Status:** ready-for-agent

- [ ] 发布流程保存版本、文件大小、SHA-256、Ed25519 签名和发布说明，且已发布制品不可覆盖。
- [ ] OTA 检查不返回不兼容型号、相同版本或更低版本的固件。
- [ ] OTA 响应提供短时下载 URL；设备可上报 downloading、verifying、installing、success 或 failed 状态。
