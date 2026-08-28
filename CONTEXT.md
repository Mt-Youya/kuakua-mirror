# 夸夸镜 - 领域术语表

## 核心概念

### 夸夸镜（KuaKua Mirror）
折叠式智能镜子，上半部分是物理镜面，下半部分是显示屏。用户按键唤醒后可与大模型进行多轮语音对话，屏幕显示对话文字内容。

### 唤醒（Wake）
通过物理按键触发设备进入对话状态。按下开始录音，松开结束录音并发送音频数据。

### 折叠镜子（Folded Mirror）
物理形态：上半部分镜面 + 下半部分显示屏，两者物理分离（非单向透视镜叠加）。

---

## 领域模型

### 设备领域（Device Domain）

#### Device（设备档案）
设备的物理身份和静态信息。一个 Device 代表一台出厂的硬件镜子。

- **属性**：deviceId（唯一标识）、serialNumber（序列号）、model（型号）、firmwareVersion（固件版本）、activatedAt（激活时间）
- **生命周期**：设备出厂时创建，激活后绑定用户，退役时归档
- **职责**：存储设备档案，不包含运行时状态

#### DeviceSession（设备会话）
设备与后端的 WebSocket 连接状态。一次连接对应一个 DeviceSession。

- **属性**：sessionId、deviceId、status（CONNECTED/IDLE/BUSY）、connectedAt、lastActivityAt、capabilities（设备能力列表）
- **生命周期**：WebSocket 连接建立时创建，连接断开时销毁
- **职责**：管理连接状态、心跳检测、消息路由
- **存储**：内存（ConcurrentHashMap），不持久化

#### DeviceProtocol（设备协议）
硬件设备与后端通信的简化协议，由后端转换为 OpenAI Realtime API 格式。

- **消息类型**：
  - `audio`：音频数据（Base64 编码）
  - `audio_end`：音频输入结束
  - `text`：文本输入（备用）
  - `heartbeat`：心跳
- **职责**：定义硬件侧的简单消息格式，避免硬件实现复杂的 OpenAI 协议

---

### 对话领域（Conversation Domain）

#### ConversationSession（对话会话）
一次按键唤醒到结束的完整对话过程，包含多轮交互。

- **属性**：sessionId、deviceId/userId（发起者）、startedAt、endedAt、status（ACTIVE/COMPLETED/ABANDONED）
- **生命周期**：用户按键唤醒时创建，对话结束或超时时关闭
- **职责**：组织多条 Message，提供上下文边界
- **聚合根**：是的，管理其下的所有 Message

#### Message（消息）
单条用户输入或 AI 回复。

- **属性**：id、sessionId（所属会话）、role（USER/ASSISTANT）、content（文本内容）、audioUrl（音频 URL，可选）、createdAt
- **生命周期**：用户说话或 AI 回复时创建，不可修改
- **职责**：记录对话内容，不包含业务逻辑
- **值对象候选**：content 可以是值对象（包含文本 + 情感标签等）

#### RealtimeConversation（实时对话）
当前正在进行的一轮对话的运行时状态，管理从音频输入到回复生成的完整流程。

- **属性**：conversationId、status（LISTENING/TRANSCRIBING/GENERATING/RESPONDING/COMPLETED）、audioBuffer（音频缓冲）、transcript（转写文本）、response（生成的回复）
- **生命周期**：用户开始说话时创建，AI 回复完成后销毁或转为历史
- **职责**：封装一次对话轮次的状态机，协调音频处理和 AI 调用
- **聚合根**：是的，管理对话流程的所有状态
- **存储**：内存，完成后持久化为 Message

#### ConversationHistory（对话历史）
对话记录的只读视图，用于 APP 展示和监控页面。

- **来源**：从 Message 表查询聚合
- **职责**：提供按设备/用户/时间查询对话历史的接口
- **不是实体**：是应用层的查询模型

---

### 音频处理领域（Audio Domain）

#### AudioChunk（音频分片）
设备上传的音频数据片段。

- **属性**：data（字节数组）、format（编码格式）、timestamp
- **值对象**：是的，不可变
- **职责**：表示一段音频数据

#### Transcription（转写结果）
语音识别的输出。

- **属性**：text（识别文本）、confidence（置信度）、language（语言）
- **值对象**：是的
- **职责**：表示 ASR 的结果

#### AudioResponse（音频回复）
TTS 生成的语音输出。

- **属性**：audioData（音频字节流）、format、duration
- **值对象**：是的
- **职责**：表示 AI 回复的语音形式

---

## 领域事件

### 设备事件
- **DeviceConnected**：设备 WebSocket 连接建立
- **DeviceDisconnected**：设备断开连接
- **HeartbeatReceived**：收到设备心跳

### 对话事件
- **ConversationStarted**：用户按键唤醒，对话开始
- **AudioInputReceived**：收到音频分片
- **AudioInputCompleted**：音频输入结束
- **TranscriptionCompleted**：语音识别完成
- **ResponseGenerated**：AI 回复生成完成
- **AudioResponseStreaming**：音频回复流式传输中
- **ConversationCompleted**：对话结束

---

## 技术组件

### 后端服务（Backend Service）
运行在云端的 WebSocket 服务器，接收设备端音频流，调用 OpenAI Realtime API，将结果推送回设备。

### 音频格式
- **编码**：Opus
- **采样率**：16kHz
- **声道**：单声道（Mono）
- **帧时长**：60ms

### 协议层次
```
硬件设备 <--[DeviceProtocol]--> 后端服务 <--[OpenAI Realtime API]--> OpenAI
```

---

## 部署架构

### 调试期
- 后端运行在开发笔记本（局域网）
- 设备通过 WiFi 连接 `ws://192.168.x.x:8080/device/ws`
- 前端监控页面运行在 `localhost:3000`

### 演示期（MVP）
- 后端部署到 Railway（`wss://kuakua-mirror.railway.app`）
- 前端部署到 Vercel（`https://kuakua-mirror.vercel.app`）
- 数据库：Supabase PostgreSQL
- 设备通过 TLS 连接后端

---

## MVP 范围约束

### 包含的领域
- 设备连接管理（Device、DeviceSession）
- 实时对话（RealtimeConversation、Message）
- 音频处理（AudioChunk、Transcription）

### 不包含的领域（未来迭代）
- 用户管理和认证（User、JWT）
- Moment 系统（Moment、Praise、Theme、Milestone）
- 日报周报（DailyReview）
- 人脸存在感知（Face Presence Detection）

### MVP 核心流程
1. 设备连接后端 WebSocket
2. 用户按键唤醒 → 发送音频
3. 后端转发给 OpenAI → 识别 + 生成回复
4. 后端返回文字和语音给设备
5. 设备显示文字 + 播放语音
6. 对话历史保存到数据库

---

## 时间约束

- **MVP 期限**：2 天（2026-08-30）
- **目标**：给投资人展示可演示的原型
- **成功标准**：硬件镜子能对话 + 手机 APP 能查看历史 + 官网能监控
