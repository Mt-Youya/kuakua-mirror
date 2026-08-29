# 夸夸镜 H5 演示

AI 情绪支持伴侣 H5 原型，包含此刻、成长、回顾、个人页、引导和登录。聊天、夸夸和里程碑反馈均为本地虚拟数据，不连接 K10、Java 后端或真实模型。

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:3000`。`server.ts` 提供演示用 `/api/health`、`/api/chat`、`/api/generate-praise` 与安全关键词检查。构建：`pnpm lint && pnpm build`；界面变更前请阅读 [交互设计规范](交互设计规范.md)。
