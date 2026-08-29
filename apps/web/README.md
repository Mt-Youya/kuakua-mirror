# 夸夸镜 Web 原型

Next.js 16 应用，包含品牌首页、`/api` OpenAPI 浏览页和旧版 `/monitor` 监控原型。`/api` 直接读取 `packages/api-docs/openapi.json`。

`/monitor` 依赖旧的 `/monitor/stream` SSE；当前 K10 Java 后端没有该接口，不能用于设备联调。

```bash
pnpm install
pnpm lint
pnpm dev
pnpm build
```

`NEXT_PUBLIC_API_BASE_URL` 只能修改旧监控原型的请求基址，不能让 K10 后端提供旧接口。修改 Next.js 代码前请查阅本目录安装的 Next.js 文档。
