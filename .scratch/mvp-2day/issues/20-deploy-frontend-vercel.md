# 20: 前端部署到 Vercel

**What to build:** 将 Next.js 前端部署到 Vercel 平台，配置环境变量（后端 API 地址），确保通过 HTTPS 公网可访问，首页和监控页面正常工作。

**Blocked by:** Ticket 13, Ticket 15

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] 在 Vercel 创建新项目（从 GitHub 仓库部署，选择 `web/` 目录）
- [ ] 配置环境变量：`NEXT_PUBLIC_API_URL=https://kuakua-mirror.railway.app`
- [ ] Vercel 自动构建并部署，获取公网地址（如 `https://kuakua-mirror.vercel.app`）
- [ ] 访问首页，产品介绍正常显示，"查看演示"按钮可点击
- [ ] 访问监控页面，能连接后端 SSE，实时显示设备和消息
- [ ] 在手机和桌面浏览器测试，页面响应式正常
