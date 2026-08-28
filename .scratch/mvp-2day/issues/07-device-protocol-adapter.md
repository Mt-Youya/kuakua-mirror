# 07: DeviceProtocolAdapter 协议转换

**What to build:** 创建 `DeviceProtocolAdapter` 服务，实现硬件简化协议与 OpenAI Realtime API 格式的双向转换。硬件发送的 `audio`/`audio_end` 消息转换为 OpenAI 的 `input_audio_buffer.append`/`input_audio_buffer.commit`，OpenAI 的响应转换为硬件能理解的 `transcript`/`response_text`/`audio_response` 消息。

**Blocked by:** Ticket 01

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] 创建 `DeviceMessage` 数据类（type, data, content 等字段）
- [ ] 创建 `OpenAIRealtimeMessage` 数据类（type, audio, transcript 等字段）
- [ ] 实现 `DeviceProtocolAdapter.translateToOpenAI(DeviceMessage)` 方法
- [ ] 实现 `DeviceProtocolAdapter.translateFromOpenAI(OpenAIRealtimeMessage)` 方法
- [ ] 编写单元测试，覆盖所有消息类型的转换
- [ ] 测试通过：`./mvnw test -Dtest=DeviceProtocolAdapterTest`
