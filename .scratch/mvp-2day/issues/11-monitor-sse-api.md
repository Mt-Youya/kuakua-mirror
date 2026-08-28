# 11: MonitorController SSE 接口

**What to build:** 创建 SSE（Server-Sent Events）接口，用于官网监控页面实时显示设备连接状态和对话消息。当设备连接/断开、收到用户消息、生成 AI 回复时，推送事件到所有连接的监控客户端。

**Blocked by:** Ticket 05

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] 创建 `MonitorController` 类
- [ ] `GET /api/monitor/stream`：返回 SSE 流（Content-Type: text/event-stream）
- [ ] 设备连接时推送 `event: device_connected` 事件（包含 deviceId）
- [ ] 设备断开时推送 `event: device_disconnected` 事件
- [ ] 收到用户消息时推送 `event: user_message` 事件（包含 deviceId, text）
- [ ] 生成 AI 回复时推送 `event: assistant_message` 事件（包含 deviceId, text）
- [ ] 使用 curl 或浏览器 EventSource 测试，能收到实时事件
