# 夸夸镜 NestJS 服务原型

保留的 NestJS + SQLite + OpenAI WebSocket 原型，不是当前 K10 的 Java / HTTP-SSE 后端。当前固件不会连接它；K10 开发请使用 [apps/backend](../backend/README.md)。

默认端口 `5090`，REST 前缀 `/api/v1`，并定义 `/device/ws`、`/audio/ws`、`/monitor/ws`。它使用 `OPENAI_API_KEY`，与当前 Java 服务的百炼凭证不同。

```bash
cp .env.example .env
npm install
npm run start:dev
npm run build
npm test
```

重新启用前必须补齐并验证与 K10 的认证、媒体格式和 API 契约。
