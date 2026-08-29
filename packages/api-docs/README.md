# 夸夸镜设备 API Schema

`openapi.json` 是设备管理、制品、OTA 与 K10 AI 接口的共享 OpenAPI Schema。Java 后端构建时将其嵌入静态资源，并通过 `GET /openapi.json` 提供；`apps/web/api` 也直接读取该文件。

```bash
pnpm validate
mvn -f ../../apps/backend/pom.xml process-resources
pnpm --dir ../../apps/web build
```

改动 Schema 时须同时核对 Java 控制器与 K10 固件。当前音频下载路径是受设备 Token 保护的 `GET /api/v1/audio/{filename}`；发现不一致时，应先修正契约再发布。
