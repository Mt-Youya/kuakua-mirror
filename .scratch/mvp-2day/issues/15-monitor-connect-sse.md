# 15: 连接后端 SSE 接口

**What to build:** 监控页面连接后端的 SSE 接口 `/api/monitor/stream`，实时接收设备连接/断开、对话消息事件，动态更新设备列表和消息流。移除 mock 数据，使用真实事件驱动 UI。

**Blocked by:** Ticket 11, Ticket 14

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] 在 `lib/api.ts` 创建 `connectMonitorStream()` 函数，使用 `EventSource` 连接 SSE
- [ ] 监听 `device_connected` 事件，将设备添加到在线列表
- [ ] 监听 `device_disconnected` 事件，将设备从在线列表移除
- [ ] 监听 `user_message` 和 `assistant_message` 事件，将消息添加到消息流
- [ ] 页面加载时自动连接 SSE，断开连接时能自动重连
- [ ] 使用后端模拟设备连接和对话，监控页面能实时显示
