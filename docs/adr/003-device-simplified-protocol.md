# ADR-003: 硬件简化协议设计

**状态**: 已接受  
**日期**: 2026-08-28  
**决策者**: 开发团队

## 背景

硬件设备需要通过 WebSocket 与后端通信，后端再调用 OpenAI Realtime API。

OpenAI Realtime API 的协议复杂：

- 多种消息类型（`session.update`、`input_audio_buffer.append`、`response.create` 等 20+ 种）
- 需要管理会话配置（模型、语音、指令等）
- 需要处理流式响应和增量更新
- 需要实现复杂的错误处理和重连逻辑

在嵌入式设备（ESP32）上实现完整协议面临挑战：

- 内存有限（~320KB 可用 RAM）
- 计算能力有限
- 固件开发周期长，调试困难
- JSON 解析库可能占用大量资源

## 决策

定义硬件简化协议（Device Protocol），由后端负责转换为 OpenAI Realtime API 格式。

### 硬件 → 后端消息格式

#### 1. 音频数据

```json
{
  "type": "audio",
  "data": "base64_encoded_audio_chunk"
}
```

#### 2. 音频输入结束

```json
{
  "type": "audio_end"
}
```

#### 3. 文本输入（备用，MVP 可能不用）

```json
{
  "type": "text",
  "content": "用户输入的文字"
}
```

#### 4. 心跳

```json
{
  "type": "heartbeat",
  "timestamp": 1693234567890
}
```

#### 5. 设备信息（连接时发送一次）

```json
{
  "type": "device_info",
  "device_id": "mirror_001",
  "firmware_version": "1.0.0",
  "capabilities": ["audio", "display", "button"]
}
```

### 后端 → 硬件消息格式

#### 1. 转写文本（用于屏幕显示）

```json
{
  "type": "transcript",
  "text": "今天心情不好"
}
```

#### 2. AI 回复文本

```json
{
  "type": "response_text",
  "text": "我听到了，能跟我说说发生了什么吗？"
}
```

#### 3. 音频数据（TTS 输出）

```json
{
  "type": "audio_response",
  "data": "base64_encoded_audio_chunk",
  "is_final": false
}
```

#### 4. 音频结束

```json
{
  "type": "audio_response_end"
}
```

#### 5. 错误

```json
{
  "type": "error",
  "code": "ASR_FAILED",
  "message": "语音识别失败，请重试"
}
```

#### 6. 心跳响应

```json
{
  "type": "pong",
  "timestamp": 1693234567890
}
```

### 协议转换层

后端实现 `DeviceProtocolAdapter` 服务：

```java
public class DeviceProtocolAdapter {

    // 硬件消息 → OpenAI 消息
    public OpenAIRealtimeMessage translateToOpenAI(DeviceMessage deviceMsg) {
        return switch (deviceMsg.getType()) {
            case "audio" -> OpenAIRealtimeMessage.builder()
                .type("input_audio_buffer.append")
                .audio(deviceMsg.getData())
                .build();

            case "audio_end" -> OpenAIRealtimeMessage.builder()
                .type("input_audio_buffer.commit")
                .build();

            // ... 其他转换
        };
    }

    // OpenAI 消息 → 硬件消息
    public DeviceMessage translateFromOpenAI(OpenAIRealtimeMessage openAIMsg) {
        return switch (openAIMsg.getType()) {
            case "conversation.item.input_audio_transcription.completed" ->
                DeviceMessage.transcript(openAIMsg.getTranscript());

            case "response.audio.delta" ->
                DeviceMessage.audioResponse(openAIMsg.getDelta(), false);

            // ... 其他转换
        };
    }
}
```

## 替代方案

### 方案 1：硬件直接实现 OpenAI 协议

硬件固件完整实现 OpenAI Realtime API 客户端。

**优点**：

- 后端只是纯代理，逻辑简单
- 硬件可以直连 OpenAI（不需要后端）

**缺点**：

- 硬件开发复杂度高
- 固件升级困难（协议变化时需要 OTA）
- 调试困难
- 无法在后端层做优化（如：缓存、批处理）

**为什么拒绝**：MVP 时间紧张（2 天），硬件工程师实现复杂协议风险太高。

### 方案 2：二进制自定义协议

不用 JSON，用更紧凑的二进制格式。

**优点**：

- 带宽占用少
- 解析更快

**缺点**：

- 开发复杂度高（需要设计帧格式、序列化/反序列化）
- 调试困难（无法直接看懂消息内容）
- 与 OpenAI API 的 JSON 格式不匹配，转换复杂

**为什么拒绝**：MVP 阶段过度优化，JSON 对于语音对话的带宽占用可接受（音频本身才是大头）。

## 后果

### 正面

- 硬件固件开发简单，只需处理 6 种消息类型
- 后端可以灵活调整 OpenAI 调用策略，不影响硬件
- 易于调试：可以用 Postman 或浏览器模拟硬件
- 协议文档清晰，硬件工程师和后端工程师职责明确

### 负面

- 后端多了一层转换逻辑
- 如果未来要支持更复杂功能（如：多模态输入），可能需要扩展协议
- 硬件无法直连 OpenAI（必须经过后端）

### 风险缓解

- 协议设计时预留扩展字段（如：`metadata` 对象）
- 版本化协议（设备连接时声明支持的协议版本）
- 后端记录所有转换日志，方便排查问题

## 实现检查清单

- [ ] 定义完整的 `DeviceMessage` 和 `OpenAIRealtimeMessage` 数据类
- [ ] 实现 `DeviceProtocolAdapter` 转换逻辑
- [ ] 编写协议文档（给硬件工程师）
- [ ] 提供 WebSocket 测试客户端示例（Python/JavaScript）
- [ ] 定义错误码表（ASR_FAILED、TTS_FAILED、NETWORK_ERROR 等）
- [ ] 实现心跳超时检测（30 秒无心跳则断开连接）

## 相关文档

- `/docs/全栈端DeviceAPI与联调规范.md`：完整的设备 API 文档
- `/backend/src/main/java/com/kuakua/mirror/device/DeviceProtocolAdapter.java`：转换层实现
