# 07: 受保护的模型与音频接口

**What to build:** 已激活 Device 才能调用图片夸奖、语音对话、TTS 和获取其音频结果；模型调用额度按 Device 合并限制。

**Blocked by:** 02: 设备激活与 Token 网关.

**Status:** ready-for-agent

- [ ] 图片夸奖、语音对话、TTS 和音频下载均拒绝缺失、无效或跨设备的 DeviceToken。
- [ ] 每个 Device 在一分钟内的图片夸奖、语音对话和 TTS 调用总数最多为 10，超限返回 429。
- [ ] 合法请求继续使用 Java 服务调用百炼，硬件不携带任何大模型凭证。
