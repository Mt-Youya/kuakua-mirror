# API 文档

KuaKua Mirror 后端服务 API 完整文档

## 目录

- [REST API](#rest-api)
- [WebSocket API](#websocket-api)
- [错误处理](#错误处理)
- [认证](#认证)

## REST API

### 基础信息

- **Base URL**: `http://localhost:8080/api`
- **Content-Type**: `application/json`
- **字符编码**: UTF-8

### 端点列表

#### 1. 健康检查

检查服务运行状态

**请求**

```http
GET /api/health
```

**响应**

```json
{
  "status": "UP",
  "timestamp": "2026-08-28T10:30:00",
  "service": "kuakua-mirror"
}
```

**状态码**

- `200 OK` - 服务正常运行

---

#### 2. 版本信息

获取服务版本信息

**请求**

```http
GET /api/version
```

**响应**

```json
{
  "version": "1.0.0",
  "name": "KuaKua Mirror Backend"
}
```

**状态码**

- `200 OK` - 成功获取版本信息

---

## WebSocket API

### 连接信息

- **WebSocket URL**: `ws://localhost:8080/v1/realtime`
- **协议**: WebSocket
- **消息格式**: JSON

### 连接建立

使用标准 WebSocket 客户端连接：

```javascript
const ws = new WebSocket("ws://localhost:8080/v1/realtime")

ws.onopen = () => {
  console.log("WebSocket 连接已建立")
}

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  console.log("收到消息:", message)
}

ws.onerror = (error) => {
  console.error("WebSocket 错误:", error)
}

ws.onclose = () => {
  console.log("WebSocket 连接已关闭")
}
```

### 消息类型

#### 客户端 → 服务端

##### 1. 会话更新 (session.update)

更新会话配置

```json
{
  "type": "session.update",
  "session": {
    "modalities": ["text", "audio"],
    "instructions": "你是一个友好的 AI 助手",
    "voice": "alloy",
    "input_audio_format": "pcm16",
    "output_audio_format": "pcm16",
    "input_audio_transcription": {
      "model": "whisper-1"
    },
    "turn_detection": {
      "type": "server_vad",
      "threshold": 0.5,
      "prefix_padding_ms": 300,
      "silence_duration_ms": 500
    },
    "tools": [],
    "tool_choice": "auto",
    "temperature": 0.8,
    "max_response_output_tokens": "inf"
  }
}
```

**字段说明**：

- `modalities`: 交互模式，可选 `["text"]` 或 `["text", "audio"]`
- `instructions`: 系统提示词，定义 AI 角色和行为
- `voice`: 语音角色，可选 `alloy`, `echo`, `shimmer` 等
- `input_audio_format`: 输入音频格式，目前仅支持 `pcm16`
- `output_audio_format`: 输出音频格式，目前仅支持 `pcm16`
- `input_audio_transcription`: 音频转录配置
- `turn_detection`: 语音活动检测配置
- `temperature`: 生成温度，范围 0-2
- `max_response_output_tokens`: 最大输出 token 数

---

##### 2. 音频输入 (audio.input)

发送音频数据

```json
{
  "type": "audio.input",
  "audio": "base64_encoded_audio_data"
}
```

**字段说明**：

- `audio`: Base64 编码的音频数据（PCM16 格式，24kHz，单声道）

---

##### 3. 音频输入完成 (audio.input_complete)

标记音频输入结束

```json
{
  "type": "audio.input_complete"
}
```

---

##### 4. 创建对话项 (conversation.item.create)

创建新的对话消息

```json
{
  "type": "conversation.item.create",
  "item": {
    "type": "message",
    "role": "user",
    "content": [
      {
        "type": "input_text",
        "text": "你好，请介绍一下自己"
      }
    ]
  }
}
```

**字段说明**：

- `item.type`: 项目类型，固定为 `message`
- `item.role`: 角色，可选 `user` 或 `assistant`
- `item.content`: 内容数组，支持 `input_text` 和 `input_audio` 类型

---

##### 5. 创建响应 (response.create)

请求 AI 生成响应

```json
{
  "type": "response.create",
  "response": {
    "modalities": ["text", "audio"],
    "instructions": "请简洁回答",
    "voice": "alloy",
    "output_audio_format": "pcm16",
    "tools": [],
    "tool_choice": "auto",
    "temperature": 0.8,
    "max_output_tokens": null
  }
}
```

**字段说明**：

- `response.modalities`: 响应模式
- `response.instructions`: 临时指令覆盖
- 其他字段与 `session.update` 类似

---

##### 6. 取消响应 (response.cancel)

取消正在进行的响应

```json
{
  "type": "response.cancel"
}
```

---

#### 服务端 → 客户端

##### 1. 会话创建 (session.created)

连接建立后返回会话信息

```json
{
  "type": "session.created",
  "event_id": "event_abc123",
  "session": {
    "id": "sess_xyz789",
    "object": "realtime.session",
    "model": "gpt-4o-realtime-preview-2024-12-17",
    "modalities": ["text", "audio"],
    "instructions": "",
    "voice": "alloy",
    "input_audio_format": "pcm16",
    "output_audio_format": "pcm16",
    "input_audio_transcription": null,
    "turn_detection": {
      "type": "server_vad",
      "threshold": 0.5,
      "prefix_padding_ms": 300,
      "silence_duration_ms": 500
    },
    "tools": [],
    "tool_choice": "auto",
    "temperature": 0.8,
    "max_response_output_tokens": "inf"
  }
}
```

---

##### 2. 会话更新完成 (session.updated)

会话配置更新成功

```json
{
  "type": "session.updated",
  "event_id": "event_def456",
  "session": {
    "id": "sess_xyz789",
    "object": "realtime.session"
    // ... 更新后的会话配置
  }
}
```

---

##### 3. 音频转录完成 (conversation.item.input_audio_transcription.completed)

语音识别完成

```json
{
  "type": "conversation.item.input_audio_transcription.completed",
  "event_id": "event_ghi789",
  "item_id": "item_abc123",
  "content_index": 0,
  "transcript": "你好，请介绍一下自己"
}
```

**字段说明**：

- `item_id`: 对话项 ID
- `content_index`: 内容索引
- `transcript`: 识别出的文本

---

##### 4. 响应开始 (response.audio.start)

AI 开始生成音频响应

```json
{
  "type": "response.audio.start",
  "event_id": "event_jkl012",
  "response_id": "resp_mno345",
  "item_id": "item_pqr678",
  "output_index": 0,
  "content_index": 0
}
```

---

##### 5. 音频数据块 (response.audio.delta)

流式音频数据

```json
{
  "type": "response.audio.delta",
  "event_id": "event_stu901",
  "response_id": "resp_mno345",
  "item_id": "item_pqr678",
  "output_index": 0,
  "content_index": 0,
  "delta": "base64_encoded_audio_chunk"
}
```

**字段说明**：

- `delta`: Base64 编码的音频数据块
- 客户端需要累积接收并播放

---

##### 6. 响应完成 (response.audio.done)

音频响应生成完成

```json
{
  "type": "response.audio.done",
  "event_id": "event_vwx234",
  "response_id": "resp_mno345",
  "item_id": "item_pqr678",
  "output_index": 0,
  "content_index": 0
}
```

---

##### 7. 错误消息 (error)

处理过程中发生错误

```json
{
  "type": "error",
  "event_id": "event_yz567",
  "error": {
    "type": "invalid_request_error",
    "code": "invalid_audio_format",
    "message": "音频格式不支持",
    "param": "audio"
  }
}
```

**错误类型**：

- `invalid_request_error`: 请求参数错误
- `authentication_error`: 认证失败
- `rate_limit_error`: 超出速率限制
- `server_error`: 服务器内部错误

---

## 错误处理

### HTTP 错误响应

所有 REST API 错误响应遵循统一格式：

```json
{
  "timestamp": "2026-08-28T10:30:00",
  "status": 400,
  "error": "Bad Request",
  "code": "INVALID_REQUEST",
  "message": "请求参数不合法",
  "path": "/api/some-endpoint"
}
```

### 常见错误码

| HTTP 状态码 | 错误码                | 说明           |
| ----------- | --------------------- | -------------- |
| 400         | `INVALID_REQUEST`     | 请求参数不合法 |
| 401         | `UNAUTHORIZED`        | 未授权访问     |
| 404         | `NOT_FOUND`           | 资源不存在     |
| 429         | `RATE_LIMIT_EXCEEDED` | 超出速率限制   |
| 500         | `INTERNAL_ERROR`      | 服务器内部错误 |
| 502         | `BAD_GATEWAY`         | 上游服务错误   |
| 503         | `SERVICE_UNAVAILABLE` | 服务暂时不可用 |

### WebSocket 错误处理

WebSocket 连接中的错误通过 `error` 类型消息传递，客户端应当：

1. 解析错误类型和消息
2. 根据错误类型决定是否重试
3. 对于致命错误，关闭连接并通知用户

---

## 认证

当前版本暂未实现认证机制。后续版本将支持：

- API Key 认证
- JWT Token 认证
- OAuth 2.0

---

## 音频格式说明

### PCM16 规格

- **格式**: 线性脉冲编码调制（Linear PCM）
- **位深度**: 16 bit
- **采样率**: 24000 Hz
- **声道**: 单声道（Mono）
- **字节序**: 小端序（Little Endian）
- **编码**: Base64（用于 WebSocket 传输）

### 音频处理示例

**编码音频数据（JavaScript）**:

```javascript
// 假设 audioBuffer 是 Int16Array
const base64Audio = btoa(String.fromCharCode.apply(null, new Uint8Array(audioBuffer.buffer)))
```

**解码音频数据（JavaScript）**:

```javascript
const binaryString = atob(base64Audio)
const bytes = new Uint8Array(binaryString.length)
for (let i = 0; i < binaryString.length; i++) {
  bytes[i] = binaryString.charCodeAt(i)
}
const audioBuffer = new Int16Array(bytes.buffer)
```

---

## 使用示例

### 完整对话流程

```javascript
const ws = new WebSocket("ws://localhost:8080/v1/realtime")

// 1. 连接建立
ws.onopen = () => {
  // 2. 更新会话配置
  ws.send(
    JSON.stringify({
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions: "你是一个友好的 AI 助手",
        voice: "alloy",
      },
    })
  )
}

// 3. 发送音频输入
function sendAudio(audioData) {
  ws.send(
    JSON.stringify({
      type: "audio.input",
      audio: audioData, // Base64 编码
    })
  )
}

// 4. 标记音频输入完成
function completeAudio() {
  ws.send(
    JSON.stringify({
      type: "audio.input_complete",
    })
  )
}

// 5. 请求生成响应
function createResponse() {
  ws.send(
    JSON.stringify({
      type: "response.create",
    })
  )
}

// 6. 接收消息
ws.onmessage = (event) => {
  const message = JSON.parse(event.data)

  switch (message.type) {
    case "session.created":
      console.log("会话已创建:", message.session.id)
      break

    case "conversation.item.input_audio_transcription.completed":
      console.log("转录结果:", message.transcript)
      break

    case "response.audio.delta":
      // 播放音频数据
      playAudio(message.delta)
      break

    case "response.audio.done":
      console.log("响应完成")
      break

    case "error":
      console.error("错误:", message.error)
      break
  }
}
```

---

## 速率限制

当前版本暂无速率限制。生产环境建议配置：

- REST API: 100 请求/分钟/IP
- WebSocket: 1000 消息/分钟/连接

---

## 更新日志

### v1.0.0 (2026-08-28)

- 初始版本发布
- 支持 REST 健康检查端点
- 支持 WebSocket 实时通信
- 集成 OpenAI Realtime API
- 支持音频流式传输

---

**文档版本**: v1.0.0  
**最后更新**: 2026-08-28
