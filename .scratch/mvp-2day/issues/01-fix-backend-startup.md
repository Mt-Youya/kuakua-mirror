# 01: 修复后端编译错误并启动服务

**What to build:** 后端 Spring Boot 应用能在本地成功启动，健康检查接口返回 200，能连接数据库（H2 或 Supabase）。修复所有编译错误，配置环境变量，确保 WebSocket 端点可访问。

**Blocked by:** 无（可立即开始）

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] 运行 `./mvnw spring-boot:run` 启动成功，无编译错误
- [ ] 访问 `http://localhost:8080/api/health` 返回 200 状态码
- [ ] 数据库连接成功（优先使用 H2 内存数据库进行快速验证）
- [ ] 查看日志确认 WebSocket 端点 `/device/ws` 已注册
- [ ] `.env` 文件配置了必要的环境变量（OPENAI_API_KEY 可以暂时留空）
