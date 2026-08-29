# API Schema

`openapi.json` 是前后端共享的唯一接口 schema。

- 后端执行 `mvn process-resources` 或 `mvn package` 时，会将它复制到 JAR 的静态资源目录，并公开为 `GET /openapi.json`。
- 前端执行构建时直接读取该文件，生成 `/api` 接口浏览页。

修改 schema 后运行：

```bash
pnpm --dir packages/api-docs validate
mvn -f apps/backend/pom.xml process-resources
pnpm --dir apps/frontend build
```
