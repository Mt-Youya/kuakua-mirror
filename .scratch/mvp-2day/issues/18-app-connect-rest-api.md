# 18: 连接后端 REST API

**What to build:** APP 连接后端 REST API，实现真实的对话功能。创建会话、发送消息、接收 AI 回复、查询历史消息。移除 mock 数据，使用真实 API 数据。

**Blocked by:** Ticket 10, Ticket 17

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] 创建 `services/api.ts` 封装后端 API 调用
- [ ] 实现 `createConversation()`：调用 `POST /api/conversations` 创建会话
- [ ] 实现 `sendMessage(sessionId, content)`：调用 `POST /api/conversations/{sessionId}/messages` 发送消息
- [ ] 实现 `getMessages(sessionId)`：调用 `GET /api/conversations/{sessionId}/messages` 查询历史
- [ ] APP 启动时创建会话，保存 sessionId
- [ ] 点击发送按钮，调用真实 API 发送消息，收到 AI 回复后更新 UI
- [ ] 启动时加载历史消息显示在列表中
- [ ] 配置后端 API 地址（环境变量或硬编码，支持 Railway 部署后的 HTTPS 地址）
- [ ] 在 Expo Go 中测试，能真实对话
