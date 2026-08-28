# 09: 硬件音频对话完整流程

**What to build:** 实现硬件设备的端到端对话流程：设备通过 WebSocket 发送音频数据 → 后端调用 OpenAI Realtime API 进行语音识别和生成回复 → 后端将转写文本、AI 回复文本和音频返回给设备 → 对话完成后保存到数据库（ConversationSession + Message）。

**Blocked by:** Ticket 05, Ticket 08

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] 集成 OpenAI Realtime API 客户端（复用或调整现有 `ai/` 模块代码）
- [ ] 设备发送 `audio` 消息流 → 后端缓冲音频
- [ ] 设备发送 `audio_end` → 后端提交音频到 OpenAI 进行识别
- [ ] 收到 OpenAI 转写结果 → 通过 `DeviceProtocolAdapter` 转换为 `transcript` 消息发回设备
- [ ] OpenAI 生成回复（文本 + 音频）→ 转换为 `response_text` 和 `audio_response` 消息发回设备
- [ ] 对话完成后，创建 `ConversationSession` 和 `Message` 记录保存到数据库
- [ ] 使用 WebSocket 客户端模拟硬件，能完成一次完整对话并在数据库中看到记录
