# K10 夸夸镜 API 接口规范文档

## 版本信息

| 项目 | 值 |
|------|-----|
| 文档版本 | v1.0.0 |
| 更新日期 | 2025-01-XX |
| 适用硬件 | DFRobot UNIHIKER K10 (ESP32-S3) |
| 后端框架 | Java Spring Boot |
| 部署平台 | Railway / 本地服务器 |

---

## 目录

1. [基础信息](#1-基础信息)
2. [接口详细说明](#2-接口详细说明)
   - [2.1 健康检查](#21-健康检查)
   - [2.2 图片夸奖（SSE流式）](#22-图片夸奖sse流式)
   - [2.3 语音对话（SSE流式）](#23-语音对话sse流式)
   - [2.4 TTS语音合成](#24-tts语音合成)
   - [2.5 下载音频文件](#25-下载音频文件)
3. [错误码定义](#3-错误码定义)
4. [数据大小限制](#4-数据大小限制)
5. [后端内部逻辑](#5-后端内部逻辑)
6. [通义千问API调用参考](#6-通义千问api调用参考)
7. [部署建议](#7-部署建议)
8. [测试用例](#8-测试用例)

---

## 1. 基础信息

### 1.1 服务器地址

| 环境 | 地址 |
|------|------|
| 本地开发 | `http://192.168.8.3:8080` |
| Railway 生产 | `https://your-app.railway.app` |

### 1.2 通信协议

| 项目 | 值 |
|------|-----|
| 协议 | HTTP/1.1 |
| 数据格式 | JSON (UTF-8) |
| 字符编码 | UTF-8 |
| 图片编码 | Base64 |
| 音频编码 | Base64 |
| 流式传输 | SSE (Server-Sent Events) |

### 1.3 认证方式

| 请求头 | 说明 | 示例 |
|--------|------|------|
| `X-API-Key` | API 密钥 | `sk-xxxxxxxxxxxxxxxx` |
| `X-Device-ID` | 设备唯一标识 | `k10-001` |
| `Content-Type` | 数据格式 | `application/json` |

### 1.4 通用响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

---

## 2. 接口详细说明

### 2.1 健康检查

**用途**: K10 启动时检测后端服务是否在线

#### 请求

```http
GET /api/health HTTP/1.1
Host: 192.168.8.3:8080
X-API-Key: your-api-key
X-Device-ID: k10-001
```

#### 响应（成功）

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "status": "ok",
    "timestamp": 1704067200000,
    "version": "1.0.0",
    "services": {
      "database": "ok",
      "qwen_api": "ok",
      "tts_service": "ok"
    }
  }
}
```

#### 响应（失败）

```json
{
  "code": 503,
  "message": "service unavailable",
  "data": {
    "status": "error",
    "services": {
      "database": "ok",
      "qwen_api": "error",
      "tts_service": "ok"
    }
  }
}
```

---

### 2.2 图片夸奖（SSE流式）

**用途**: K10 上传照片，后端调用通义千问 VL 模型分析，流式返回夸奖文字

#### 请求

```http
POST /api/praise/stream HTTP/1.1
Host: 192.168.8.3:8080
Content-Type: application/json
Accept: text/event-stream
X-API-Key: your-api-key
X-Device-ID: k10-001

{
  "device_id": "k10-001",
  "image_base64": "/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...",
  "timestamp": 1704067200000
}
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `device_id` | string | 是 | 设备唯一标识 |
| `image_base64` | string | 是 | JPEG 图片 Base64 编码 |
| `timestamp` | number | 是 | Unix 时间戳（毫秒） |

#### SSE 响应流

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: message
data: {"type":"status","content":"正在分析照片...","step":1}

event: message
data: {"type":"text","content":"今","index":0}

event: message
data: {"type":"text","content":"天","index":1}

event: message
data: {"type":"text","content":"的","index":2}

event: message
data: {"type":"text","content":"你","index":3}

event: message
data: {"type":"text","content":"很","index":4}

event: message
data: {"type":"text","content":"好","index":5}

event: message
data: {"type":"text","content":"看","index":6}

event: message
data: {"type":"audio","url":"/audio/praise_abc123.wav","duration":2.5}

event: message
data: {"type":"complete","full_text":"今天的你很好看","praise_id":"praise_abc123"}
```

#### SSE 事件类型

| 事件类型 | 说明 | 数据格式 |
|---------|------|---------|
| `status` | 处理状态更新 | `{"type":"status","content":"...","step":N}` |
| `text` | 文本片段（逐字） | `{"type":"text","content":"X","index":N}` |
| `audio` | 音频文件就绪 | `{"type":"audio","url":"...","duration":N}` |
| `complete` | 处理完成 | `{"type":"complete","full_text":"...","praise_id":"..."}` |
| `error` | 错误 | `{"type":"error","message":"..."}` |

---

### 2.3 语音对话（SSE流式）

**用途**: K10 上传录音，后端 ASR 识别 + LLM 对话 + TTS 合成，流式返回

#### 请求

```http
POST /api/chat/stream HTTP/1.1
Host: 192.168.8.3:8080
Content-Type: application/json
Accept: text/event-stream
X-API-Key: your-api-key
X-Device-ID: k10-001

{
  "device_id": "k10-001",
  "audio_base64": "UklGRiQAAABXQVZFZm10IBAAAAABAAEA...",
  "session_id": "session-001",
  "timestamp": 1704067200000
}
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `device_id` | string | 是 | 设备唯一标识 |
| `audio_base64` | string | 是 | WAV 音频 Base64 编码 |
| `session_id` | string | 是 | 会话 ID（多轮对话） |
| `timestamp` | number | 是 | Unix 时间戳（毫秒） |

#### SSE 响应流

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: message
data: {"type":"status","content":"正在识别语音...","step":1}

event: message
data: {"type":"asr_result","user_text":"我今天好看吗","confidence":0.95}

event: message
data: {"type":"status","content":"AI思考中...","step":2}

event: message
data: {"type":"text","content":"你","index":0}

event: message
data: {"type":"text","content":"看","index":1}

event: message
data: {"type":"text","content":"起","index":2}

event: message
data: {"type":"text","content":"来","index":3}

event: message
data: {"type":"text","content":"很","index":4}

event: message
data: {"type":"text","content":"有","index":5}

event: message
data: {"type":"text","content":"精","index":6}

event: message
data: {"type":"text","content":"神","index":7}

event: message
data: {"type":"audio","url":"/audio/chat_def456.wav","duration":3.2}

event: message
data: {"type":"complete","user_text":"我今天好看吗","ai_text":"你看起来很有精神","session_end":false}
```

#### SSE 事件类型（对话）

| 事件类型 | 说明 | 数据格式 |
|---------|------|---------|
| `status` | 处理状态 | `{"type":"status","content":"...","step":N}` |
| `asr_result` | 语音识别结果 | `{"type":"asr_result","user_text":"...","confidence":N}` |
| `text` | AI 回复文本片段 | `{"type":"text","content":"X","index":N}` |
| `audio` | AI 回复音频 | `{"type":"audio","url":"...","duration":N}` |
| `complete` | 对话完成 | `{"type":"complete","user_text":"...","ai_text":"...","session_end":bool}` |
| `error` | 错误 | `{"type":"error","message":"..."}` |

---

### 2.4 TTS 语音合成

**用途**: K10 将文字转为语音（用于本地夸奖播报）

#### 请求

```http
POST /api/tts HTTP/1.1
Host: 192.168.8.3:8080
Content-Type: application/json
X-API-Key: your-api-key
X-Device-ID: k10-001

{
  "device_id": "k10-001",
  "text": "你真好看",
  "voice": "xiaoyun",
  "format": "wav"
}
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `device_id` | string | 是 | 设备唯一标识 |
| `text` | string | 是 | 要合成的文字（≤100字） |
| `voice` | string | 否 | 语音角色，默认 `xiaoyun` |
| `format` | string | 否 | 音频格式，默认 `wav` |

#### 语音角色选项

| 角色 | 说明 |
|------|------|
| `xiaoyun` | 女声，温柔 |
| `xiaogang` | 男声，沉稳 |
| `xiaomei` | 女声，甜美 |
| `xiaowan` | 女声，活泼 |

#### 响应（成功）

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "audio_url": "/audio/tts_ghi789.wav",
    "duration": 2.5,
    "format": "wav",
    "sample_rate": 16000
  }
}
```

---

### 2.5 下载音频文件

**用途**: K10 从后端下载生成的音频到 SD 卡

#### 请求

```http
GET /audio/{filename} HTTP/1.1
Host: 192.168.8.3:8080
X-API-Key: your-api-key
X-Device-ID: k10-001
```

#### 路径参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `filename` | 音频文件名 | `praise_abc123.wav` |

#### 响应

```
HTTP/1.1 200 OK
Content-Type: audio/wav
Content-Length: 123456
Cache-Control: max-age=3600

[二进制音频数据]
```

#### 响应头

| 头部 | 说明 |
|------|------|
| `Content-Type` | `audio/wav` |
| `Content-Length` | 文件大小（字节） |
| `Cache-Control` | 缓存策略 |

---

## 3. 错误码定义

| 错误码 | HTTP状态 | 说明 | K10 处理方式 |
|--------|---------|------|-------------|
| 200 | 200 | 成功 | 正常处理 |
| 400 | 400 | 请求参数错误 | 显示"请求错误" |
| 401 | 401 | API Key 无效或缺失 | 显示"认证失败" |
| 403 | 403 | 设备未授权 | 显示"设备未授权" |
| 404 | 404 | 接口不存在 | 显示"接口错误" |
| 413 | 413 | 请求体过大 | 显示"文件太大" |
| 429 | 429 | 请求频率限制 | 显示"请求太频繁" |
| 500 | 500 | 服务器内部错误 | 显示"服务繁忙" |
| 502 | 502 | 通义千问 API 异常 | 使用本地夸奖兜底 |
| 503 | 503 | 服务不可用 | 使用本地夸奖兜底 |

#### 错误响应格式

```json
{
  "code": 500,
  "message": "internal server error",
  "error": "qwen_api_timeout",
  "data": null
}
```

---

## 4. 数据大小限制

| 数据类型 | 限制 | 说明 |
|---------|------|------|
| 图片 Base64 | < 500KB | JPEG 压缩后，约 30万像素 |
| 音频 Base64 | < 1MB | WAV 16kHz 16bit，约 10秒 |
| 文本内容 | < 100字 | 夸奖 ≤ 15 字，对话 ≤ 50 字 |
| 请求频率 | 10次/分钟 | 每设备限制 |
| 并发连接 | 5个 | 每设备限制 |

---

## 5. 后端内部逻辑

### 5.1 图片夸奖流程

```
K10 上传图片
    ↓
后端接收 Base64 → 解码为 JPEG → 保存临时文件
    ↓
调用通义千问 VL API (qwen-vl-max)
    ↓
解析 VL 返回的夸奖文字
    ↓
调用通义千问 TTS API (qwen-tts)
    ↓
生成 WAV 音频 → 保存到静态目录
    ↓
SSE 流式返回：逐字文本 → 音频 URL → 完成
```

### 5.2 语音对话流程

```
K10 上传音频
    ↓
后端接收 Base64 → 解码为 WAV → 保存临时文件
    ↓
调用通义千问 ASR API (paraformer)
    ↓
获取用户文字 → 保存到会话上下文
    ↓
调用通义千问 LLM API (qwen-turbo)
    ↓
获取 AI 回复文字
    ↓
调用通义千问 TTS API (qwen-tts)
    ↓
生成 WAV 音频 → 保存到静态目录
    ↓
SSE 流式返回：ASR结果 → 逐字文本 → 音频 URL → 完成
```

### 5.3 会话管理

```
会话存储: Redis / 内存
    ↓
Key: session_id
    ↓
Value: {
  "device_id": "k10-001",
  "history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "created_at": timestamp,
  "expires_at": timestamp + 300000  // 5分钟过期
}
    ↓
最多保存 3 轮对话，超出自动结束
```

---
 

## 8. 测试用例

### 8.1 健康检查

```bash
curl -X GET "http://192.168.8.3:8080/api/health" \
  -H "X-API-Key: your-api-key" \
  -H "X-Device-ID: k10-001"
```

### 8.2 图片夸奖（SSE）

```bash
curl -X POST "http://192.168.8.3:8080/api/praise/stream" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "X-API-Key: your-api-key" \
  -H "X-Device-ID: k10-001" \
  -d '{
    "device_id": "k10-001",
    "image_base64": "/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...",
    "timestamp": 1704067200000
  }'
```

### 8.3 语音对话（SSE）

```bash
curl -X POST "http://192.168.8.3:8080/api/chat/stream" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "X-API-Key: your-api-key" \
  -H "X-Device-ID: k10-001" \
  -d '{
    "device_id": "k10-001",
    "audio_base64": "UklGRiQAAABXQVZFZm10IBAAAAABAAEA...",
    "session_id": "session-001",
    "timestamp": 1704067200000
  }'
```

### 8.4 TTS 语音合成

```bash
curl -X POST "http://192.168.8.3:8080/api/tts" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "X-Device-ID: k10-001" \
  -d '{
    "device_id": "k10-001",
    "text": "你真好看",
    "voice": "xiaoyun",
    "format": "wav"
  }'
```

### 8.5 下载音频

```bash
curl -X GET "http://192.168.8.3:8080/audio/praise_abc123.wav" \
  -H "X-API-Key: your-api-key" \
  -H "X-Device-ID: k10-001" \
  --output praise.wav
```

---

## 附录

### A. K10 端配置示例

```cpp
// config.h
#define WIFI_SSID "YourWiFi"
#define WIFI_PASSWORD "YourPassword"
#define SERVER_HOST "http://192.168.8.3:8080"
#define API_KEY "your-api-key"
#define DEVICE_ID "k10-001"
```

### B. 本地夸奖兜底文案

```cpp
const char* LOCAL_PRAISES[] = {
    "今天的你也很棒",
    "笑容真有感染力",
    "这发型很适合你",
    "气质满分",
    "闪闪发光的你",
    "穿搭品味一流",
    "元气满满",
    "自信的人最美"
};
```

---

**文档结束**

如有问题，请联系开发团队。
