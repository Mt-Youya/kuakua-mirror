# 夸夸镜 MVP 技术规格

**版本**: 1.0  
**日期**: 2026-08-28  
**截止日期**: 2026-08-30（2天）  
**状态**: Ready for Implementation

---

## 问题陈述

投资人需要在 2 天内看到夸夸镜产品的可演示原型，证明核心技术可行性：一个折叠式智能镜子能够通过语音与用户进行自然对话，并且配套的手机 APP 和官网能够展示系统运行状态。

当前状态：

- 后端有 4,227 行代码但从未运行过，存在编译错误
- 前端和移动端完全不存在（0 行代码）
- 硬件固件有 demo 但未对接后端
- 完整 PRD 定义了 8 个实体和 4 个功能模块，2 天内无法完成

核心挑战：

- 时间极度紧张（48 小时）
- 多端开发（硬件 + 后端 + Web + 移动端）
- 团队资源有限（3-4 人）
- 技术风险高（后端未测试，硬件协议未定义）

---

## 解决方案

构建 MVP 最小可行演示版本，聚焦核心价值：**实时语音对话**。

### 交付物

1. **硬件镜子演示**：用户按键 → 说话 → AI 回复 → 屏幕显示文字 → 扬声器播放语音
2. **手机 APP（Expo）**：用户可以在手机上对话、查看历史记录
3. **官网（Next.js）**：首页展示产品（3D 动画）+ 监控页面实时显示硬件对话状态

### 技术架构

```
硬件镜子 ──[DeviceProtocol/WebSocket]──→ 后端 (Spring Boot)
                                           ↓
                                     [OpenAI Realtime API]
                                           ↓
                                      [Supabase DB]
                                           ↑
APP (Expo) ──[REST/WebSocket]─────────────┤
官网 (Next.js) ──[SSE]────────────────────┘

部署: Railway (后端) + Vercel (前端) + Supabase (数据库)
```

### 范围简化

**保留**：

- 实时对话（硬件 + APP）
- 对话历史存储和查询
- 设备连接管理

**砍掉**（未来迭代）：

- Moment/Praise/Theme/Milestone 领域
- 用户认证和授权
- 人格切换、MBTI 配置
- 日报周报、成长曲线
- 安全闸门（自伤检测）
- Onboarding 流程

---

## 用户故事

### 硬件镜子对话（核心）

1. 作为用户，我想按下镜子上的按键开始录音，这样我可以向镜子说话
2. 作为用户，我想松开按键结束录音，这样系统知道我说完了
3. 作为用户，我想在屏幕上看到我说的话被识别成文字，这样我知道系统听懂了
4. 作为用户，我想看到 AI 的回复文字显示在屏幕上，这样我可以阅读回复内容
5. 作为用户，我想听到扬声器播放 AI 的语音回复，这样我可以不看屏幕就能获得回应
6. 作为用户，我想对话结束后屏幕保持显示最后的内容，这样我可以回顾刚才说了什么
7. 作为用户，我想可以随时按键打断 AI 的回复，这样我可以控制对话节奏
8. 作为用户，我想镜子断网后能提示连接失败，这样我知道为什么没有回复
9. 作为用户，我想镜子能记住最近的对话内容，这样 AI 可以联系上下文回复我

### 手机 APP（Expo）

10. 作为用户，我想在手机上打开 APP 看到一个对话界面，这样我可以开始和 AI 聊天
11. 作为用户，我想在 APP 里输入文字发送消息，这样我不需要硬件镜子也能对话
12. 作为用户，我想看到 AI 的回复显示在聊天界面，这样我可以阅读回复
13. 作为用户，我想上滑查看历史对话记录，这样我可以回顾之前说过的话
14. 作为用户，我想看到每条消息的时间戳，这样我知道对话是什么时候发生的
15. 作为用户，我想 APP 能显示"正在输入..."状态，这样我知道 AI 正在思考
16. 作为用户，我想 APP 断网后能提示网络错误，这样我知道为什么发不出消息
17. 作为用户，我想可以在 Expo Go 里扫码运行 APP，这样投资人可以现场安装测试

### 官网（Next.js）

18. 作为访客，我想打开官网首页看到产品介绍，这样我可以了解夸夸镜是什么
19. 作为访客，我想在首页看到折叠镜子的 3D 动画展示，这样我可以直观理解产品形态
20. 作为访客，我想看到产品的核心功能说明，这样我知道它能做什么
21. 作为访客，我想点击"查看演示"按钮进入监控页面，这样我可以看到系统运行状态
22. 作为演示者，我想在监控页面看到当前连接的硬件设备列表，这样我知道哪些镜子在线
23. 作为演示者，我想实时看到硬件镜子的对话内容，这样我可以向投资人展示系统在工作
24. 作为演示者，我想看到每条消息的角色（用户/AI）和时间，这样我可以理解对话流程
25. 作为演示者，我想监控页面自动刷新显示最新消息，这样我不需要手动刷新页面

### 设备管理

26. 作为硬件设备，我想连接后端 WebSocket 时发送设备信息，这样后端知道我的身份
27. 作为硬件设备，我想定期发送心跳消息，这样后端知道我还在线
28. 作为硬件设备，我想断开连接后能自动重连，这样临时网络抖动不会中断服务
29. 作为后端系统，我想检测设备心跳超时后标记为离线，这样监控页面能显示准确状态
30. 作为后端系统，我想限制每个设备同时只能有一个活跃对话，这样避免状态混乱

### 对话历史

31. 作为用户，我想对话结束后内容被保存到数据库，这样我可以随时回顾
32. 作为用户，我想在 APP 里按时间倒序查看历史对话，这样我可以找到最近的记录
33. 作为用户，我想每条历史记录显示是从哪个设备发起的（镜子/APP），这样我知道对话场景
34. 作为开发者，我想对话历史按会话组织，这样我可以区分不同的对话轮次
35. 作为开发者，我想历史记录包含完整的用户输入和 AI 回复，这样我可以用于后续分析

### 部署和运维

36. 作为开发者，我想后端能通过环境变量配置 OpenAI API key，这样我不需要硬编码
37. 作为开发者，我想后端能通过 Docker 容器运行，这样部署到 Railway 很简单
38. 作为开发者，我想前端能自动部署到 Vercel，这样我推送代码后自动上线
39. 作为开发者，我想数据库使用 Supabase PostgreSQL，这样我不需要自己管理数据库
40. 作为开发者，我想后端有健康检查接口，这样我知道服务是否正常运行

---

## 实现决策

### 领域模型简化

基于 ADR-004，MVP 只保留 3 个核心实体：

1. **Device**（设备档案）
   - 持久化设备的物理信息：deviceId、serialNumber、model、firmwareVersion
   - 不包含运行时状态（连接状态、心跳等）
   - MVP 阶段可以简化为仅用 deviceId 字符串标识，表结构可选

2. **ConversationSession**（对话会话）
   - 一次按键唤醒到结束的完整对话
   - 属性：sessionId、deviceId（可选，APP 对话为空）、startedAt、endedAt、status
   - 作为聚合根，管理其下的所有 Message

3. **Message**（消息）
   - 单条用户输入或 AI 回复
   - 属性：id、sessionId、role（USER/ASSISTANT）、content、audioUrl、createdAt
   - 重命名自原有的 `Conversation` 实体，消除术语混淆

**删除的实体**（Moment 领域）：

- User（用户认证暂不做）
- Moment、Praise、Theme、Milestone、UserMilestone、DailyReview（成长系统暂不做）

### 实时对话聚合根

基于 ADR-002，创建 `RealtimeConversation` 聚合根管理对话流程。

**状态机**：

```
LISTENING (音频输入中)
    ↓ audioInputCompleted()
TRANSCRIBING (语音识别中)
    ↓ transcriptionCompleted(text)
GENERATING (生成回复中)
    ↓ responseGenerated(text, audio)
RESPONDING (音频输出中)
    ↓ audioStreamCompleted()
COMPLETED (已完成)
```

**职责**：

- 缓冲音频数据直到输入结束
- 协调 OpenAI Realtime API 调用
- 发布领域事件（TranscriptionCompleted、ResponseGenerated 等）
- 确保状态一致性（防止非法状态转换）
- 完成后持久化为 Message 记录

**并发策略**：

- 一个设备同时只能有一个 ACTIVE 的 RealtimeConversation
- 用户按键打断时，自动终止旧对话并创建新对话

**存储**：

- 运行时：内存（ConcurrentHashMap）
- 完成后：持久化为 Message 到数据库
- 清理策略：COMPLETED 状态保留 5 分钟后清理

### 硬件简化协议

基于 ADR-003，定义硬件与后端的简化 WebSocket 协议。

**硬件 → 后端消息**：

1. `device_info`：设备信息（连接时发送一次）
2. `audio`：音频数据（Base64 编码）
3. `audio_end`：音频输入结束
4. `heartbeat`：心跳

**后端 → 硬件消息**：

1. `transcript`：转写文本（屏幕显示）
2. `response_text`：AI 回复文本
3. `audio_response`：音频数据（TTS 输出）
4. `audio_response_end`：音频结束
5. `error`：错误信息
6. `pong`：心跳响应

**协议转换层**：

- 创建 `DeviceProtocolAdapter` 服务
- 负责硬件简化协议 ↔ OpenAI Realtime API 格式的双向转换
- 硬件无需实现复杂的 OpenAI 协议，降低固件开发难度

### 模块划分

#### 后端模块（Spring Boot）

1. **device 模块**
   - `DeviceSession`（内存）：WebSocket 连接状态管理
   - `DeviceWebSocketHandler`：处理硬件设备的 WebSocket 连接
   - `DeviceProtocolAdapter`：协议转换
   - `DeviceSessionManager`：管理所有设备会话，心跳检测

2. **conversation 模块**
   - `ConversationSession`（实体）：对话会话
   - `Message`（实体）：消息记录
   - `RealtimeConversation`（聚合根）：实时对话状态机
   - `ConversationService`：对话业务逻辑
   - `ConversationSessionRepository`：会话持久化
   - `MessageRepository`：消息持久化

3. **ai 模块**
   - `OpenAIRealtimeClient`：OpenAI Realtime API 客户端
   - `RealtimeWebSocketHandler`：处理 OpenAI WebSocket 连接
   - 保留现有实现，与 DeviceProtocolAdapter 集成

4. **api 模块**（新增）
   - `ConversationController`：REST API（APP 调用）
     - `POST /api/conversations`：创建对话
     - `POST /api/conversations/{id}/messages`：发送消息
     - `GET /api/conversations/{sessionId}/messages`：查询历史
   - `MonitorController`：SSE 接口（官网监控页面）
     - `GET /api/monitor/stream`：实时推送设备对话事件
   - `HealthController`：健康检查（保留现有）

5. **shared 模块**
   - 保留现有的配置、异常处理、工具类
   - 新增领域事件发布器

#### 前端模块（Next.js）

1. **pages/index.tsx**：官网首页
   - 3D 动画展示折叠镜子（使用 three.js + react-three-fiber + gsap）
   - 产品介绍文案
   - "查看演示"按钮跳转到监控页面

2. **pages/monitor.tsx**：监控页面
   - 连接 `/api/monitor/stream` SSE 接口
   - 显示当前在线设备列表
   - 实时显示对话消息流（用户消息 + AI 回复）
   - 简单的聊天界面样式（使用 shadcn/ui）

3. **components/Mirror3D.tsx**：3D 镜子模型
   - 使用 react-three-fiber 渲染折叠镜子
   - gsap 动画：镜子展开/折叠、屏幕亮起

4. **lib/api.ts**：API 客户端
   - 封装后端 REST API 调用

#### 移动端模块（Expo）

1. **App.tsx**：应用入口
   - 简单的单屏 APP，无导航

2. **screens/ChatScreen.tsx**：对话界面
   - 消息列表（ScrollView）
   - 输入框 + 发送按钮
   - 调用后端 REST API 发送消息
   - 轮询或 WebSocket 接收新消息（MVP 用轮询更简单）

3. **services/api.ts**：API 客户端
   - 封装后端 REST API 调用

### 数据库 Schema

```sql
-- 设备（可选，MVP 可以只用内存）
CREATE TABLE devices (
    device_id VARCHAR(50) PRIMARY KEY,
    serial_number VARCHAR(100),
    model VARCHAR(50),
    firmware_version VARCHAR(20),
    activated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 对话会话
CREATE TABLE conversation_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(50) UNIQUE NOT NULL,
    device_id VARCHAR(50),  -- 可选，APP 对话为空
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ACTIVE'  -- ACTIVE, COMPLETED, ABANDONED
);

-- 消息（重命名自 conversations 表）
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,  -- USER, ASSISTANT
    content TEXT NOT NULL,
    audio_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (session_id) REFERENCES conversation_sessions(session_id)
);

-- 索引
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_sessions_device ON conversation_sessions(device_id);
```

### API 契约

#### REST API（APP 调用）

**创建对话会话**

```http
POST /api/conversations
Content-Type: application/json

{
  "deviceId": null  // APP 对话为 null
}

Response 201:
{
  "sessionId": "sess_abc123",
  "startedAt": "2026-08-28T10:30:00Z"
}
```

**发送消息**

```http
POST /api/conversations/sess_abc123/messages
Content-Type: application/json

{
  "content": "今天心情不好"
}

Response 200:
{
  "userMessage": {
    "id": 1,
    "role": "USER",
    "content": "今天心情不好",
    "createdAt": "2026-08-28T10:30:01Z"
  },
  "assistantMessage": {
    "id": 2,
    "role": "ASSISTANT",
    "content": "我听到了，能跟我说说发生了什么吗？",
    "createdAt": "2026-08-28T10:30:03Z"
  }
}
```

**查询历史消息**

```http
GET /api/conversations/sess_abc123/messages?limit=20

Response 200:
{
  "messages": [
    {
      "id": 2,
      "role": "ASSISTANT",
      "content": "我听到了...",
      "createdAt": "2026-08-28T10:30:03Z"
    },
    {
      "id": 1,
      "role": "USER",
      "content": "今天心情不好",
      "createdAt": "2026-08-28T10:30:01Z"
    }
  ]
}
```

#### SSE API（监控页面）

**实时事件流**

```http
GET /api/monitor/stream
Accept: text/event-stream

Response:
event: device_connected
data: {"deviceId": "mirror_001", "timestamp": "2026-08-28T10:30:00Z"}

event: transcript
data: {"deviceId": "mirror_001", "text": "今天心情不好", "timestamp": "..."}

event: response
data: {"deviceId": "mirror_001", "text": "我听到了...", "timestamp": "..."}

event: device_disconnected
data: {"deviceId": "mirror_001", "timestamp": "..."}
```

#### WebSocket API（硬件设备）

**连接端点**：`wss://kuakua-mirror.railway.app/device/ws`

**消息格式**见 ADR-003。

### 部署配置

**Railway（后端）**：

- Dockerfile 构建 Spring Boot 应用
- 环境变量：
  - `OPENAI_API_KEY`
  - `DATABASE_URL`（Supabase 连接字符串）
  - `SERVER_PORT=8080`
- 健康检查：`GET /api/health`

**Vercel（前端）**：

- `next build` 构建
- 环境变量：
  - `NEXT_PUBLIC_API_URL`（Railway 后端地址）
- 自动部署（推送到 main 分支）

**Supabase（数据库）**：

- PostgreSQL 15
- 公网访问（通过连接字符串）
- 初始化脚本：运行 Schema SQL

**Expo**：

- 开发模式：`expo start`
- 投资人通过 Expo Go 扫码安装
- 不打包成独立 APK/IPA（时间不够）

---

## 测试决策

### 测试原则

**只测试外部行为，不测试实现细节**：

- ✅ 测试：给定输入，验证输出和副作用（如数据库记录、发送的消息）
- ❌ 不测试：私有方法、内部状态变化、调用了哪个依赖

**测试层次**（从高到低）：

1. **集成测试**（优先）：测试完整的业务流程，包含数据库和外部 API（mock）
2. **单元测试**（补充）：测试复杂的领域逻辑（如状态机转换）
3. **E2E 测试**（时间不够，跳过）：MVP 阶段手动测试

### 需要测试的模块

#### 1. RealtimeConversation 聚合根

**测试什么**：

- 状态机转换的合法性（如：不能在 LISTENING 状态调用 `transcriptionCompleted`）
- 领域事件的发布（如：调用 `completeAudioInput` 后发布 `AudioInputCompleted` 事件）
- 音频缓冲的正确性

**测试示例**：

```java
@Test
void shouldTransitionToTranscribingWhenAudioInputCompleted() {
    var conversation = RealtimeConversation.create("conv_123");
    conversation.appendAudio(audioChunk1);
    conversation.appendAudio(audioChunk2);

    conversation.completeAudioInput();

    assertEquals(ConversationStatus.TRANSCRIBING, conversation.getStatus());
    verify(eventPublisher).publish(any(AudioInputCompleted.class));
}

@Test
void shouldThrowExceptionWhenTranscribingBeforeListening() {
    var conversation = RealtimeConversation.create("conv_123");

    assertThrows(IllegalStateException.class, () -> {
        conversation.transcriptionCompleted("text");
    });
}
```

**现有测试参考**：

- 无（项目里没有测试），需要从零开始建立测试规范

#### 2. DeviceProtocolAdapter

**测试什么**：

- 硬件消息正确转换为 OpenAI 消息
- OpenAI 消息正确转换为硬件消息
- 边界情况（如：空消息、未知类型）

**测试示例**：

```java
@Test
void shouldTranslateDeviceAudioToOpenAIAppend() {
    var deviceMsg = DeviceMessage.audio("base64data");

    var openAIMsg = adapter.translateToOpenAI(deviceMsg);

    assertEquals("input_audio_buffer.append", openAIMsg.getType());
    assertEquals("base64data", openAIMsg.getAudio());
}
```

#### 3. ConversationService 集成测试

**测试什么**：

- 创建对话会话后能查询到
- 发送消息后正确保存到数据库
- 查询历史消息按时间倒序返回

**测试示例**：

```java
@SpringBootTest
@Transactional
class ConversationServiceIntegrationTest {

    @Autowired
    private ConversationService service;

    @Autowired
    private MessageRepository messageRepo;

    @Test
    void shouldSaveMessagesWhenConversationCompletes() {
        var sessionId = service.createSession(null);
        service.sendMessage(sessionId, "Hello");

        var messages = messageRepo.findBySessionId(sessionId);

        assertEquals(2, messages.size());  // USER + ASSISTANT
        assertEquals("Hello", messages.get(0).getContent());
    }
}
```

**现有测试参考**：

- 无，需要建立 Spring Boot 集成测试模板

#### 4. 前端组件测试

**MVP 阶段跳过**：时间不够，手动测试。

**未来补充**：

- 监控页面：mock SSE 事件，验证消息正确渲染
- 3D 组件：snapshot 测试

#### 5. 手动测试清单

**硬件对话流程**：

1. 硬件连接后端，监控页面显示"设备已连接"
2. 按键说话 → 屏幕显示转写文字
3. AI 回复 → 屏幕显示回复文字 + 扬声器播放语音
4. 查询数据库，验证对话记录已保存

**APP 对话流程**：

1. 打开 APP，输入文字 → 发送
2. 界面显示 AI 回复
3. 上滑查看历史记录

**监控页面**：

1. 打开监控页面 → 显示在线设备
2. 硬件对话时 → 实时显示消息
3. 硬件断开 → 显示"设备已离线"

**部署验证**：

1. Railway 部署成功 → 访问健康检查接口返回 200
2. Vercel 部署成功 → 访问官网首页正常加载
3. Supabase 连接成功 → 查询数据库有表结构

---

## 范围外

以下功能**明确不在 MVP 范围内**，未来迭代再实现：

### 产品功能

1. **Moment 系统**：用户说的话"留下"成为 Moment，关联主题、难度分
2. **成长模块**：主题列表、里程碑、成长线路径、成长故事
3. **回顾模块**：日报、周报、趋势图（难度分曲线）
4. **我的页面**：人格切换、MBTI 配置、内耗标签管理
5. **Onboarding 流程**：首次打开的引导和配置
6. **安全闸门**：自伤/伤人内容检测和干预
7. **夸夸生成**：每日夸夸、镜子夸夸（基于历史的个性化鼓励）
8. **人脸存在感知**：检测人脸后亮屏/熄屏

### 技术功能

9. **用户认证**：注册、登录、JWT token
10. **多用户支持**：一个设备多个用户，用户识别
11. **设备激活**：激活码、设备绑定用户
12. **固件升级**：OTA 升级、版本管理
13. **音频优化**：降噪、回声消除、音量归一化
14. **实时通知**：Push notification、WebSocket 推送
15. **数据分析**：对话统计、用户行为分析
16. **国际化**：多语言支持
17. **无障碍**：屏幕阅读器、键盘导航
18. **性能优化**：缓存、CDN、数据库索引优化
19. **监控告警**：日志聚合、错误追踪、性能监控
20. **AB 测试**：功能开关、灰度发布

### 部署和运维

21. **CI/CD 流水线**：自动化测试、部署
22. **多环境**：dev/staging/prod 环境隔离
23. **数据库备份**：定期备份、灾难恢复
24. **扩容方案**：负载均衡、水平扩展
25. **安全加固**：HTTPS、SQL 注入防护、XSS 防护（基础的会做，深度加固不做）

---

## 补充说明

### 时间分配建议

**今天（8月28日）剩余时间（6-8 小时）**：

- 后端调试和修复（4 小时）：修复编译错误，启动服务，测试 WebSocket 连接
- 硬件协议文档（1 小时）：整理 ADR-003 发给硬件工程师
- 环境准备（1 小时）：申请 OpenAI API key，创建 Supabase 项目，注册 Railway/Vercel

**明天（8月29日）全天（12-16 小时）**：

- 上午（6 小时）：
  - 后端代码重构（3 小时）：删除 Moment 代码，重命名 Conversation → Message，创建 RealtimeConversation
  - 后端部署（2 小时）：部署到 Railway，配置 Supabase，测试 API
  - 前端初始化（1 小时）：创建 Next.js 项目，配置 three.js
- 下午（6 小时）：
  - Expo APP 开发（4 小时）：对话界面 + API 对接
  - 前端官网（2 小时）：首页基本结构 + 监控页面
- 晚上（4 小时）：
  - 硬件对接（3 小时）：和硬件工程师联调，测试完整流程
  - 前端 3D 动画（1 小时）：简化版 3D 镜子展示

**后天（8月30日）上午（4-6 小时）**：

- 集成测试（2 小时）：测试所有流程，修 bug
- 前端部署（1 小时）：部署到 Vercel
- 演示准备（1 小时）：准备演示话术，录制备用视频
- 彩排（1 小时）：模拟完整演示流程

### 风险和应对

**风险 1：后端无法启动**

- 应对：准备 H2 内存数据库作为 fallback，跳过 Supabase

**风险 2：硬件固件来不及**

- 应对：做一个 Web 页面模拟硬件（浏览器 + 麦克风 + 文字显示）

**风险 3：3D 动画做不出来**

- 应对：降级为 2D 动画或静态产品图片 + 简单过渡效果

**风险 4：Expo 打包失败**

- 应对：只演示 Expo Go 扫码运行，不打包独立 APP

**风险 5：OpenAI API 调用失败**

- 应对：准备一些预设的回复作为 fallback，demo 模式

### 演示话术准备

**投资人问："APP 的成长模块在哪？"**

- 回答："MVP 先验证核心技术可行性——实时语音对话。成长模块的产品逻辑已经设计好（展示 PRD），我们会在接下来 2 周内实现。今天主要展示硬件和 AI 能力。"

**投资人问："这和市面上的语音助手有什么区别？"**

- 回答：
  1. "硬件形态不同——折叠镜子，镜子 + 屏幕的设计是情绪支持场景的最佳载体。"
  2. "未来的差异化在长期陪伴——主题成长线、难度趋势、个性化夸夸，这些都在 PRD 里（展示文档）。"
  3. "MVP 先证明技术基础扎实，产品功能会快速迭代。"

### 成功标准

**必须达成**：

1. 硬件镜子能完成一次完整对话（按键 → 说话 → AI 回复 → 显示 + 播放）
2. 手机 APP 能发送消息并收到回复
3. 官网监控页面能实时显示硬件对话内容
4. 所有组件部署到云端，可通过公网访问

**加分项**：5. 3D 动画效果好 6. 对话历史查询功能完整 7. 错误处理优雅（断网、超时等）

**可以妥协**：8. 3D 动画简化为 2D 9. 硬件用 Web 页面模拟 10. Expo 只演示 Expo Go，不打包

---

**准备好开始实施了吗？如果有任何问题或需要调整，请立即提出。时间紧迫，我们必须立即行动。**
