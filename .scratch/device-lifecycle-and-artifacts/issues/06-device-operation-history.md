# 06: 设备运行记录与历史

**What to build:** 已激活 Device 的心跳、OTA 状态和 DeviceDiagnosticLog 被持久化，并可作为 DeviceOperationHistory 按类型和时间分页查询。

**Blocked by:** 02: 设备激活与 Token 网关; 04: 设备图片上传; 05: OTA 固件发布与检查.

**Status:** ready-for-agent

- [ ] 设备只能写入和查询自身的运行记录。
- [ ] DeviceDiagnosticLog 仅接受结构化诊断数据，单条最多 16 KiB，拒绝令牌、音频和图片内容。
- [ ] 图片保留 30 天、诊断日志保留 7 天、心跳和 OTA 状态保留 30 天，历史查询分页行为稳定。
