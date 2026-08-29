# 夸夸镜 Technical Architecture

> Version: 1.0  
> 范围：Web + Backend + AI + Device + ESP32-S3  
> 当前硬件方向：Seeed Studio XIAO ESP32-S3 类设备

---

# 1. 总体架构

```txt
┌──────────────────────────────┐
│        Kuakua Mirror         │
│                              │
│ Camera                       │
│ Microphone                   │
│ Speaker                      │
│ Display                      │
│ Wi-Fi                        │
│ Bluetooth                    │
└───────────────┬──────────────┘
                │
                │ HTTPS / WS / MQTT
                ↓
┌──────────────────────────────┐
│        Device Gateway        │
│                              │
│ Auth                         │
│ Session                      │
│ Device State                 │
│ Event Routing                │
└───────────────┬──────────────┘
                ↓
┌──────────────────────────────┐
│           Backend            │
│                              │
│ User                         │
│ Device                       │
│ Conversation                 │
│ Memory                       │
│ AI Gateway                   │
└───────┬─────────┬────────────┘
        │         │
        ↓         ↓
┌────────────┐ ┌──────────────┐
│ AI Models  │ │ Data Layer   │
│            │ │              │
│ LLM        │ │ PostgreSQL   │
│ Vision     │ │ Redis        │
│ STT        │ │ Object Store │
│ TTS        │ │              │
└────────────┘ └──────────────┘
```

---

# 2. 重要架构原则

不要把 ESP32-S3 当成浏览器电脑。

ESP32-S3 更适合：

- Camera capture
- Microphone capture
- Speaker playback
- Wi-Fi
- BLE
- HTTP
- WebSocket
- MQTT
- Basic local logic

不适合：

- 运行完整 Chrome
- Next.js
- WebGL
- 大型 AI 模型
- 复杂 Web UI

因此架构应为：

> 硬件负责采集和播放，云端负责 AI。

---

# 3. Web 技术栈

推荐：

```txt
Next.js
TypeScript
pnpm
Tailwind CSS
shadcn/ui
Base UI
Zod
TanStack Query
Zustand
```

动画：

```txt
Motion
GSAP
Three.js
React Three Fiber
Drei
```

---

# 4. Monorepo

推荐：

```txt
apps/
├── web
├── api
└── admin

packages/
├── ui
├── ai
├── database
├── device-protocol
├── config
├── types
└── validation
```

如果后端使用 Spring Boot：

```txt
apps/
├── web
└── backend

packages/
├── ui
├── types
└── protocol
```

Java 后端单独 Gradle Multi-Module 也可以。

---

# 5. Backend Modules

推荐：

```txt
Auth
User
Device
Pairing
Conversation
Memory
Compliment
AI Gateway
Vision
STT
TTS
Analytics
Admin
```

---

# 6. Device Identity

每台设备需要：

```txt
device_id
device_secret / certificate
firmware_version
hardware_version
capabilities
owner_user_id
last_seen_at
status
```

---

# 7. 设备配网

推荐使用 BLE Provisioning。

流程：

```txt
用户打开手机 / Web
    ↓
Bluetooth 搜索夸夸镜
    ↓
连接设备
    ↓
发送 Wi-Fi SSID / Password
    ↓
设备连接 Wi-Fi
    ↓
设备向 Cloud Register
    ↓
账号绑定 Device
```

不要让用户在硬件上手输 Wi-Fi 密码。

---

# 8. 设备通信协议

建议分三类。

## HTTPS

适合：

- Register
- Config
- Firmware metadata
- History
- Device management

## WebSocket

适合：

- 实时状态
- 对话事件
- Streaming token
- Device command

## MQTT

如果未来设备数量较多，适合：

- Device online/offline
- Telemetry
- Remote command
- Device event

MVP 可以先：

```txt
HTTPS + WebSocket
```

---

# 9. Voice Pipeline

推荐：

```txt
Microphone
   ↓
VAD
   ↓
Audio Stream
   ↓
STT
   ↓
Text
   ↓
LLM
   ↓
Response
   ↓
TTS
   ↓
Audio Stream
   ↓
Speaker
```

---

# 10. Camera Pipeline

不要默认持续上传视频。

建议：

```txt
Presence Detection
      ↓
Trigger
      ↓
Capture Frame
      ↓
Compress
      ↓
Vision API
      ↓
Structured Context
      ↓
Discard Raw Frame
```

推荐尽量使用：

> 事件驱动截图

而不是：

> 24/7 视频流云端分析

---

# 11. Vision Result

不要直接把 Vision 自由文本塞给 LLM。

推荐结构化：

```json
{
  "personPresent": true,
  "expression": "slight_smile",
  "outfit": {
    "primaryColor": "white"
  },
  "hair": {
    "style": "long"
  },
  "confidence": 0.82
}
```

然后由 AI Gateway 转换成安全上下文。

---

# 12. AI Gateway

所有模型请求统一经过 AI Gateway。

职责：

```txt
Model Routing
Prompt Version
Safety
Context Building
Vision Filtering
Memory
Rate Limiting
Observability
Fallback
Cost Tracking
```

浏览器和设备都不应该直接持有模型 API Key。

---

# 13. Conversation Session

推荐：

```ts
type ConversationSession = {
  id: string
  userId: string
  deviceId?: string
  channel: "web" | "mirror"
  startedAt: string
  endedAt?: string
}
```

---

# 14. Streaming

镜子语音需要尽量减少延迟。

推荐：

```txt
STT Streaming
↓
LLM Streaming
↓
Sentence Chunking
↓
TTS Streaming
```

不要等完整长回答生成后才开始 TTS。

---

# 15. WebRTC 是否需要

MVP：

不一定需要 WebRTC。

如果只是：

- 设备上传音频
- 服务端返回音频

WebSocket 足够。

WebRTC 适合未来：

- 高频实时双向音频
- 低延迟语音
- 视频实时通信

---

# 16. 数据库

推荐 PostgreSQL。

主要表：

```txt
users
devices
device_bindings
conversations
messages
compliments
feedback
memories
preferences
prompt_versions
device_events
```

---

# 17. Redis

用于：

- Session
- Rate Limit
- Device Presence
- Short-lived conversation state
- Queue
- Pub/Sub

---

# 18. Object Storage

如果确实需要短期文件：

- Audio temp
- Firmware
- Share images

使用：

```txt
S3
Cloudflare R2
Supabase Storage
```

尽量不长期保存摄像头原始照片。

---

# 19. Privacy by Design

默认：

```txt
Raw Video: 不保存
Raw Image: 默认不保存
Raw Audio: 默认不保存
Conversation: 用户可管理
Memory: 用户可关闭
```

设备 UI 应明确显示：

```txt
Camera Active
Microphone Active
Cloud Processing
```

---

# 20. Hardware Kill Switch

推荐硬件支持：

## Camera Shutter

物理遮挡。

## Mic Kill Switch

物理断开麦克风。

它们不仅是功能，也是品牌信任设计。

---

# 21. Website API

示例：

```txt
POST /api/v1/compliments
POST /api/v1/conversations
GET  /api/v1/conversations/:id
POST /api/v1/feedback
POST /api/v1/waitlist
```

Device：

```txt
POST /api/v1/devices/register
POST /api/v1/devices/pair
GET  /api/v1/devices/:id/config
POST /api/v1/devices/:id/events
```

---

# 22. WebSocket Events

示例：

```txt
device.connected
device.disconnected

conversation.started
conversation.user_audio_started
conversation.transcript
conversation.ai_text_delta
conversation.tts_chunk
conversation.finished
```

---

# 23. 硬件状态机

推荐：

```txt
BOOT
 ↓
CONNECTING_WIFI
 ↓
ONLINE
 ↓
IDLE
 ↓
PERSON_DETECTED
 ↓
LISTENING
 ↓
THINKING
 ↓
SPEAKING
 ↓
IDLE
```

错误：

```txt
OFFLINE
ERROR
UPDATING
```

---

# 24. MVP 联调顺序

不要一上来同时调所有硬件。

推荐：

## Phase 1

ESP32-S3：

```txt
Wi-Fi
↓
HTTPS Ping
↓
WebSocket
```

## Phase 2

Microphone：

```txt
Capture
↓
Upload
↓
STT
```

## Phase 3

Speaker：

```txt
TTS
↓
Audio Download/Stream
↓
Playback
```

## Phase 4

完整语音：

```txt
Mic → STT → LLM → TTS → Speaker
```

## Phase 5

Camera：

```txt
Capture Frame
↓
Vision
↓
Context
↓
LLM
```

## Phase 6

完整镜子体验：

```txt
Presence
↓
Vision
↓
Voice
↓
LLM
↓
TTS
```

---

# 25. 部署建议

Web：

```txt
Vercel
Cloudflare
```

Backend：

```txt
Railway
Fly.io
Render
AWS
国内云服务器
```

Database：

```txt
Supabase PostgreSQL
Neon
Managed PostgreSQL
```

Redis：

```txt
Upstash
Managed Redis
```

---

# 26. 中国网络考虑

如果夸夸镜最终主要在中国大陆部署：

不要依赖用户侧稳定访问境外服务。

需要考虑：

- API 可访问性
- DNS
- CDN
- 模型供应商
- 数据合规
- ICP / 服务器部署
- STT/TTS 延迟

生产环境最好抽象：

```txt
AI Provider Adapter
STT Provider Adapter
TTS Provider Adapter
```

避免绑定单一海外服务。

---

# 27. Provider Interface

例如：

```ts
interface LLMProvider {
  stream(input: LLMInput): AsyncIterable<string>
}

interface STTProvider {
  transcribe(audio: Uint8Array): Promise<string>
}

interface TTSProvider {
  synthesize(text: string): Promise<Uint8Array>
}

interface VisionProvider {
  analyze(image: Uint8Array): Promise<VisionContext>
}
```

---

# 28. Observability

必须记录：

- Request latency
- STT latency
- LLM first token latency
- TTS first audio latency
- End-to-end latency
- Error rate
- Device offline count
- Prompt version
- Model usage

但不要记录不必要的隐私数据。

---

# 29. 性能目标

语音体验建议目标：

```txt
VAD detection: < 300ms
STT partial: < 800ms
LLM first token: < 1s
TTS first audio: < 800ms
```

整体用户感受：

> 用户说完后 1～2 秒内开始得到反馈。

---

# 30. 最终原则

硬件不是为了炫技。

AI 不是为了展示模型能力。

Web 不是为了堆动画。

整个技术系统最终都服务于一件事情：

> **让用户自然地感受到：镜子真的注意到了她，并且对她说了一句刚刚好的话。**
