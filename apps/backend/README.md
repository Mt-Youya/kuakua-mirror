# KuaKua Mirror Backend

夸夸镜后端服务 - 基于 Spring Boot WebFlux 的实时语音对话系统

## 功能特性

- 🎤 实时语音输入处理（ASR - Automatic Speech Recognition）
- 🤖 AI 对话生成（LLM - Large Language Model）
- 🔊 语音合成输出（TTS - Text-to-Speech）
- 🔌 WebSocket 实时通信
- ⚡ 响应式编程（Project Reactor）

## 技术栈

- Java 21
- Spring Boot 3.2.0
- Spring WebFlux（响应式 Web 框架）
- Project Reactor（响应式流）
- WebSocket（实时通信）
- Jackson（JSON 序列化）
- Lombok（代码简化）
- OpenAI API（ASR/LLM/TTS）

## 项目结构

```
backend/
├── src/main/java/com/kuakua/mirror/
│   ├── MirrorApplication.java          # 应用程序入口
│   ├── config/                          # 配置类
│   │   ├── JacksonConfig.java          # Jackson JSON 配置
│   │   ├── OpenAIConfig.java           # OpenAI API 配置
│   │   ├── WebClientConfig.java        # HTTP 客户端配置
│   │   └── WebSocketConfig.java        # WebSocket 配置
│   ├── controller/                      # REST 控制器
│   │   └── HealthController.java       # 健康检查
│   ├── handler/                         # WebSocket 处理器
│   │   └── RealtimeWebSocketHandler.java # 实时对话处理器
│   ├── service/                         # 业务服务
│   │   ├── ASRService.java             # 语音识别服务
│   │   ├── LLMService.java             # LLM 对话服务
│   │   ├── TTSService.java             # 语音合成服务
│   │   └── SessionManager.java         # 会话管理服务
│   ├── model/                           # 数据模型
│   │   ├── ConversationItem.java       # 对话项模型
│   │   └── WebSocketEvent.java         # WebSocket 事件模型
│   ├── exception/                       # 异常处理
│   │   ├── BusinessException.java      # 业务异常
│   │   └── GlobalExceptionHandler.java # 全局异常处理器
│   └── util/                            # 工具类
│       └── IdGenerator.java            # ID 生成工具
└── src/main/resources/
    └── application.yml                  # 应用配置
```

## 快速开始

### 前置要求

- JDK 21+
- Maven 3.6+
- OpenAI API Key

### 配置

1. 设置环境变量：

```bash
export OPENAI_API_KEY=your_openai_api_key
```

2. 或在 `application.yml` 中配置：

```yaml
openai:
  api-key: your_openai_api_key
  api-base: https://api.openai.com
```

### 运行

```bash
# 编译
./mvnw clean compile

# 运行
./mvnw spring-boot:run
```

服务将在 `http://localhost:8080` 启动。

## API 端点

### REST API

- `GET /api/health` - 健康检查
- `GET /api/version` - 版本信息

### WebSocket

- `ws://localhost:8080/v1/realtime` - 实时语音对话 WebSocket 端点

## WebSocket 消息格式

### 客户端 → 服务端

#### 1. 音频输入

```json
{
  "type": "audio.input",
  "audio": "base64_encoded_audio_data"
}
```

#### 2. 音频输入完成

```json
{
  "type": "audio.input_complete"
}
```

#### 3. 创建对话项（文本输入）

```json
{
  "type": "conversation.item.create",
  "item": {
    "type": "message",
    "role": "user",
    "content": [
      {
        "type": "input_text",
        "text": "你好"
      }
    ]
  }
}
```

#### 4. 创建响应

```json
{
  "type": "response.create"
}
```

#### 5. 取消响应

```json
{
  "type": "response.cancel"
}
```

#### 6. 更新会话配置

```json
{
  "type": "session.update",
  "session": {
    "modalities": ["text", "audio"],
    "voice": "alloy",
    "instructions": "你是一个友好的助手"
  }
}
```

### 服务端 → 客户端

#### 1. 转录结果

```json
{
  "type": "conversation.item.input_audio_transcription.completed",
  "event_id": "event_xxx",
  "data": {
    "item_id": "item_xxx",
    "transcript": "转录的文本"
  }
}
```

#### 2. 响应开始

```json
{
  "type": "response.audio.start",
  "event_id": "event_xxx",
  "data": {
    "response_id": "resp_xxx"
  }
}
```

#### 3. 音频数据块

```json
{
  "type": "response.audio.delta",
  "event_id": "event_xxx",
  "data": {
    "delta": "base64_encoded_audio_chunk"
  }
}
```

#### 4. 响应完成

```json
{
  "type": "response.audio.done",
  "event_id": "event_xxx",
  "data": {
    "response_id": "resp_xxx"
  }
}
```

#### 5. 错误

```json
{
  "type": "error",
  "event_id": "event_xxx",
  "data": {
    "message": "错误信息"
  }
}
```

## 音频格式

- 格式：PCM16
- 采样率：24000 Hz
- 声道：单声道（Mono）
- 编码：Base64

## 开发指南

### 添加新的消息类型

1. 在 `RealtimeWebSocketHandler.handleMessage()` 中添加新的 case
2. 实现对应的处理方法
3. 定义相应的响应事件格式

### 扩展服务

所有服务都使用响应式编程模型（Reactor），返回 `Mono` 或 `Flux`：

- `Mono<T>` - 0 或 1 个元素的异步序列
- `Flux<T>` - 0 到 N 个元素的异步序列

## 许可证

MIT
