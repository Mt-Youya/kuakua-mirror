# 14: 监控页面 UI 实现

**What to build:** 实现监控页面的 UI 结构和样式，包括在线设备列表、对话消息流（聊天界面样式）。使用 mock 数据测试 UI 效果，暂不连接真实后端。

**Blocked by:** Ticket 12

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] 页面标题"实时监控"
- [ ] 左侧边栏显示在线设备列表（使用 mock 数据：mirror_001, mirror_002）
- [ ] 右侧主区域显示对话消息流，聊天界面样式（用户消息靠右，AI 消息靠左）
- [ ] 每条消息显示时间戳、角色（用户/AI）、内容
- [ ] 使用 shadcn/ui 的 Card、ScrollArea、Badge 等组件
- [ ] 页面美观，消息自动滚动到最新
