# 08: DeviceWebSocketHandler 设备连接

**What to build:** 创建 `DeviceWebSocketHandler` 处理硬件设备的 WebSocket 连接，注册端点 `/device/ws`。处理设备发送的 `device_info`、`heartbeat`、`audio` 消息，维护 `DeviceSession` 状态，响应心跳，将音频消息路由到 `RealtimeConversation` 聚合。

**Blocked by:** Ticket 06, Ticket 07

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] 创建 `DeviceWebSocketHandler` 类，实现 WebSocket 消息处理
- [ ] 配置 WebSocket 端点 `/device/ws`
- [ ] 收到 `device_info` 消息时创建 `DeviceSession` 并存入内存
- [ ] 收到 `heartbeat` 消息时更新 `lastActivityAt` 并响应 `pong`
- [ ] 收到 `audio` 消息时调用 `DeviceProtocolAdapter` 转换，转发给 `RealtimeConversation`
- [ ] 使用 WebSocket 测试工具（如 wscat）能成功连接并发送消息
- [ ] 日志显示消息正确接收和处理
