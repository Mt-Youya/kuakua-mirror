# 19: 后端部署到 Railway

**What to build:** 将后端 Spring Boot 应用部署到 Railway 平台，配置环境变量（OPENAI_API_KEY, DATABASE_URL），确保通过 HTTPS 公网可访问，健康检查通过，连接 Supabase 数据库。

**Blocked by:** Ticket 09, Ticket 10, Ticket 11

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] 在 Railway 创建新项目（从 GitHub 仓库部署）
- [ ] 配置环境变量：`OPENAI_API_KEY`、`DATABASE_URL`（Supabase 连接字符串）、`SERVER_PORT=8080`
- [ ] Railway 自动检测 Dockerfile 或 Maven 配置，构建并部署
- [ ] 获取 Railway 分配的公网地址（如 `https://kuakua-mirror.railway.app`）
- [ ] 访问 `https://kuakua-mirror.railway.app/api/health` 返回 200
- [ ] 使用 Postman 测试 REST API，能正常调用
- [ ] 查看 Railway 日志，确认应用运行正常，无错误
