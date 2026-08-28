# 22: 端到端集成测试

**What to build:** 完整测试三条主路径：硬件对话（使用测试工具模拟）、APP 对话（Expo Go）、监控页面实时显示。发现并修复 bug，确保演示流程流畅。

**Blocked by:** Ticket 19, Ticket 20, Ticket 18

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] **路径 1：硬件对话**
  - [ ] 使用 `test-device-client` 脚本连接后端
  - [ ] 发送音频数据，收到 transcript 和 response_text
  - [ ] 在数据库中查询到对话记录
  - [ ] 监控页面实时显示对话消息
- [ ] **路径 2：APP 对话**
  - [ ] 在 Expo Go 打开 APP
  - [ ] 发送文字消息，收到 AI 回复
  - [ ] 上滑查看历史消息
  - [ ] 断网测试，显示网络错误提示
- [ ] **路径 3：监控页面**
  - [ ] 打开 Vercel 部署的监控页面
  - [ ] 看到在线设备列表
  - [ ] 硬件或 APP 对话时，监控页面实时更新
- [ ] 记录所有发现的 bug 并修复
- [ ] 三条路径全部通过，无阻塞性错误
