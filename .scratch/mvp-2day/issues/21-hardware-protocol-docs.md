# 21: 硬件协议文档和测试工具

**What to build:** 基于 ADR-003 整理完整的硬件协议文档（Markdown 格式），包含所有消息类型、格式示例、错误码。提供 WebSocket 测试客户端脚本（Python 或 Node.js），硬件工程师能用它验证协议。

**Blocked by:** Ticket 07

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] 创建 `docs/硬件协议文档.md`，包含：
  - [ ] WebSocket 连接地址和握手流程
  - [ ] 硬件 → 后端的 6 种消息类型（device_info, audio, audio_end, heartbeat, text）及 JSON 格式示例
  - [ ] 后端 → 硬件的 6 种消息类型（transcript, response_text, audio_response, audio_response_end, error, pong）及格式示例
  - [ ] 错误码表（ASR_FAILED, TTS_FAILED, NETWORK_ERROR 等）
- [ ] 创建测试脚本 `tools/test-device-client.py` 或 `.js`：
  - [ ] 连接后端 WebSocket `/device/ws`
  - [ ] 发送 device_info 和 heartbeat
  - [ ] 发送模拟的音频数据（base64 编码）
  - [ ] 接收并打印后端返回的消息
- [ ] 运行测试脚本，能成功连接并收发消息
- [ ] 将文档和脚本提交到 Git 仓库
