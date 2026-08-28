# 17: 对话界面 UI（mock 数据）

**What to build:** 实现聊天界面的完整 UI，包括消息列表（ScrollView）、输入框、发送按钮。使用 mock 数据测试 UI 交互（点击发送按钮添加消息到列表），暂不调用真实 API。

**Blocked by:** Ticket 16

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] 消息列表（FlatList 或 ScrollView），显示用户消息和 AI 回复
- [ ] 用户消息靠右显示（蓝色背景），AI 消息靠左显示（灰色背景）
- [ ] 每条消息显示时间戳
- [ ] 底部输入框 + 发送按钮
- [ ] 点击发送按钮，将输入文字添加到消息列表，模拟 AI 回复（延迟 1 秒后添加 mock 回复）
- [ ] 消息列表自动滚动到最新消息
- [ ] 在 Expo Go 中测试，UI 美观，交互流畅
