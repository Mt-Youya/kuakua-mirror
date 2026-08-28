# 10: ConversationController REST API

**What to build:** 创建 REST API 控制器，提供给手机 APP 调用的对话接口。包括创建对话会话、发送消息（同步返回 AI 回复）、查询历史消息。

**Blocked by:** Ticket 05

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] 创建 `ConversationController` 类
- [ ] `POST /api/conversations`：创建新会话，返回 `sessionId`
- [ ] `POST /api/conversations/{sessionId}/messages`：发送用户消息，调用 OpenAI 生成回复，返回用户消息和 AI 回复
- [ ] `GET /api/conversations/{sessionId}/messages?limit=20`：查询历史消息，按时间倒序返回
- [ ] 使用 Postman 或 curl 测试所有接口，返回正确的 JSON 数据
- [ ] 消息保存到数据库，能在数据库中查询到
