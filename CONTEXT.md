# 夸夸镜 - 领域术语表

## 核心概念

### 夸夸镜（KuaKua Mirror）

折叠式智能镜子，上半部分是物理镜面，下半部分是显示屏。用户按键唤醒后可与大模型进行多轮语音对话，屏幕显示对话文字内容。

### 唤醒（Wake）

通过物理按键触发设备进入对话状态。按下开始录音，松开结束录音并发送音频数据。

### 折叠镜子（Folded Mirror）

物理形态：上半部分镜面 + 下半部分显示屏，两者物理分离（非单向透视镜叠加）。

### H5 应用画布（H5 App Frame）

H5 中承载用户内容的可用显示区域，以及其外围固定操作区。它只定义内容可见与可操作的空间，不包含用户资料、对话或成长记录等领域状态。

### 陪伴弹层（Companion Dialog）

在当前陪伴流程上展示短暂信息或收集一次性输入的居中场景。它不承载对话会话，也不替代 H5 应用画布中的全屏场景。

---

## 领域模型

### 设备领域（Device Domain）

#### Device（设备档案）

设备的物理身份和静态信息。一个 Device 代表一台出厂登记的硬件镜子。

- **属性**：deviceId（唯一标识）、serialNumber（全局唯一序列号）、model（型号）、firmwareVersion（固件版本）、activatedAt（激活时间）
- **生命周期**：设备出厂登记后等待激活；激活后可调用硬件接口；退役时归档
- **职责**：存储设备档案，不包含运行时状态

#### FactoryActivationCode（出厂激活码）

设备出厂时与序列号一一绑定的一次性配对凭证。设备首次联网时提交序列号和该激活码，后端只接受预先登记的匹配项。

- **状态**：UNUSED、CONSUMED、REVOKED
- **生命周期**：出厂登记时创建；首次成功激活后变为 CONSUMED；设备恢复出厂后由管理员签发新的恢复码
- **安全边界**：服务端只保存激活码哈希，绝不保存或返回明文

#### DeviceToken（设备令牌）

设备激活成功后签发的设备级凭证。它用于证明硬件身份，不是大模型 API Key。

- **生命周期**：激活时签发；恢复出厂、设备退役、数据迁移或管理员撤销时失效
- **职责**：授权设备调用其自身的配置、心跳、AI、音频和运维接口
- **安全边界**：服务端只保存令牌哈希；令牌所属设备必须与请求中的设备 ID 一致

#### DeviceImage（设备图片）

设备上传并归属到单一 Device 的图片制品。

- **职责**：保存图片文件与采集时间、内容类型等元数据，供设备历史查询
- **存储边界**：图片文件存入私有对象存储；数据库只保存元数据和对象引用
- **调用边界**：上传图片不触发模型调用；图片夸奖由独立请求显式发起

#### FirmwareRelease（固件发布）

可供设备下载的不可变固件制品，包含版本、文件大小、SHA-256 校验值、Ed25519 签名和发布说明。

- **职责**：决定指定硬件型号在 stable 渠道可获得的最新版本；不提供降级版本
- **生命周期**：内部发布命令创建；设备下载并上报结果；已发布制品不可覆盖
- **访问边界**：设备先以 DeviceToken 获取 OTA 检查结果，再使用短时下载 URL 获取制品

#### DeviceDiagnosticLog（设备诊断日志）

设备为排障上传的结构化运行记录，不包含用户输入、设备令牌、音频或图片内容。

- **职责**：记录设备的异常与运行状态，供有限期历史查询
- **边界**：单条日志最大 16 KiB，不作为通用数据采集通道

#### DeviceOperationHistory（设备运行历史）

按设备、类型和时间查询的只读记录视图，聚合设备图片、心跳、OTA 状态和设备日志。

- **职责**：为硬件和后续运维提供分页历史查询，不承担实时状态管理

#### DeviceProtocol（设备协议）

硬件设备与后端通信的 HTTP/SSE 契约。后端负责调用阿里云百炼的文本、视觉和语音模型；硬件不持有任何大模型凭证。

- **消息类型**：
  - `audio`：音频数据（Base64 编码）
  - `audio_end`：音频输入结束
  - `text`：文本输入（备用）
  - `heartbeat`：心跳
- **职责**：定义硬件侧的简单请求和 SSE 事件格式，设备通过 DeviceToken 证明身份

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

运行在云端的 Java HTTP/SSE 服务，接收设备图片或音频请求，调用阿里云百炼，并管理 Supabase 私有对象制品。

### 音频格式

- **编码**：Opus
- **采样率**：16kHz
- **声道**：单声道（Mono）
- **帧时长**：60ms

### 协议层次

```
硬件设备 <--[DeviceToken + HTTP/SSE]--> Java 后端 <--[DashScope SDK]--> 阿里云百炼
```

---

## 部署架构

### 调试期

- 后端运行在开发笔记本（局域网）
- 设备通过 WiFi 调用 `http://192.168.x.x:8080/api/...`

### 演示期（MVP）

- 后端部署到 Railway（`https://kuakua-api.cyrusdoyle.me`）
- 数据库：Supabase PostgreSQL
- 设备通过 TLS 连接后端

---

## MVP 范围约束

### 包含的领域

- 设备激活和制品管理（Device、FactoryActivationCode、FirmwareRelease）
- 实时对话（RealtimeConversation、Message）
- 音频处理（AudioChunk、Transcription）

### 不包含的领域（未来迭代）

- 用户管理和认证（User、JWT）
- Moment 系统（Moment、Praise、Theme、Milestone）
- 日报周报（DailyReview）
- 人脸存在感知（Face Presence Detection）

### MVP 核心流程

1. 出厂设备以序列号和一次性码激活
2. 用户按键唤醒 → 设备提交音频请求
3. Java 后端调用阿里云百炼 → 识别 + 生成回复
4. 后端通过 SSE 返回文字和短时受保护音频 URL
5. 设备显示文字 + 播放语音

---

## 时间约束

- **MVP 期限**：2 天（2026-08-30）
- **目标**：给投资人展示可演示的原型
- **成功标准**：硬件镜子能对话 + 手机 APP 能查看历史 + 官网能监控
