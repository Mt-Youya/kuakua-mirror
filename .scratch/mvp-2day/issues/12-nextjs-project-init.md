# 12: Next.js 项目初始化

**What to build:** 在项目根目录创建 Next.js 前端项目（目录名：`frontend/`），配置 TypeScript、Tailwind CSS、shadcn/ui 组件库。创建基本的页面结构和路由。

**Blocked by:** 无（可立即开始）

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] 运行 `npx create-next-app@latest frontend` 创建项目（选择 TypeScript, Tailwind CSS, App Router）
- [ ] 配置 shadcn/ui：`npx shadcn-ui@latest init`
- [ ] 创建 `app/page.tsx`（首页）和 `app/monitor/page.tsx`（监控页面）
- [ ] 创建 `lib/api.ts` 文件用于封装 API 调用
- [ ] 运行 `npm run dev`，访问 `http://localhost:3000` 能看到默认页面
- [ ] 确认 Tailwind CSS 样式生效
