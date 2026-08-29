# 架构设计文档

KuaKua Mirror 后端系统架构设计

## 目录

- [系统概述](#系统概述)
- [技术栈](#技术栈)
- [架构设计](#架构设计)
- [核心组件](#核心组件)
- [数据流](#数据流)
- [并发模型](#并发模型)
- [异常处理](#异常处理)
- [性能优化](#性能优化)
- [扩展性设计](#扩展性设计)

## 系统概述

KuaKua Mirror 是一个基于 Spring Boot WebFlux 的实时 AI 语音对话系统，采用响应式编程模型实现高并发、低延迟的双向语音通信。

### 核心特性

- **全异步非阻塞**: 基于 Reactor 的响应式架构
- **双向实时通信**: WebSocket 全双工通信
- **流式处理**: 音频数据流式传输和处理
- **会话管理**: 完整的会话生命周期管理
- **弹性设计**: 自动重试、超时控制、错误恢复

### 设计目标

1. **高性能**: 单实例支持 1000+ 并发连接
2. **低延迟**: 端到端延迟 < 500ms
3. **高可用**: 99.9% 服务可用性
4. **可扩展**: 水平扩展支持
5. **可维护**: 清晰的模块划分和代码结构

---

## 技术栈

### 核心框架

| 技术            | 版本  | 用途            |
| --------------- | ----- | --------------- |
| Spring Boot     | 3.2.0 | 应用框架        |
| Spring WebFlux  | 6.1.x | 响应式 Web 框架 |
| Project Reactor | 3.6.x | 响应式编程库    |
| Reactor Netty   | 1.1.x | 异步网络通信    |

### 通信协议

- **REST API**: HTTP/1.1
- **WebSocket**: RFC 6455
- **音频编码**: PCM16 (24kHz, 16-bit, mono)
- **数据编码**: Base64

### 构建工具

- **Maven**: 3.6.3+
- **Java**: 21
- **Docker**: 20.10+

---

## 架构设计

### 分层架构

```
┌─────────────────────────────────────────┐
│          Presentation Layer             │
│  (REST Controllers, WebSocket Handlers) │
├─────────────────────────────────────────┤
│           Service Layer                 │
│    (Business Logic, Session Mgmt)       │
├─────────────────────────────────────────┤
│          Integration Layer              │
│       (OpenAI API Client)               │
├─────────────────────────────────────────┤
│           Support Layer                 │
│    (Utilities, Exceptions, Config)      │
└─────────────────────────────────────────┘
```

#### 1. Presentation Layer (表现层)

**职责**: 处理客户端请求，管理 WebSocket 连接

**组件**:

- `HealthController`: REST 健康检查端点
- `RealtimeWebSocketHandler`: WebSocket 消息处理器

**特点**:

- 请求验证
- 协议转换
- 连接生命周期管理

#### 2. Service Layer (服务层)

**职责**: 核心业务逻辑，会话状态管理

**组件**:

- `SessionService`: 会话 CRUD 操作
- `RealtimeService`: 实时对话协调
- `AudioService`: 音频处理逻辑

**特点**:

- 无状态设计
- 响应式流编排
- 事务边界定义

#### 3. Integration Layer (集成层)

**职责**: 外部系统集成，API 调用封装

**组件**:

- `OpenAIClient`: OpenAI API 客户端
- `WebSocketClient`: WebSocket 连接管理

**特点**:

- 连接池管理
- 自动重试机制
- 熔断降级

#### 4. Support Layer (支持层)

**职责**: 横切关注点，通用工具

**组件**:

- `IdGenerator`: 唯一 ID 生成
- `BusinessException`: 业务异常定义
- `GlobalExceptionHandler`: 全局异常处理
- 配置类、常量定义

---

## 核心组件

### 1. WebSocket 处理器

```
RealtimeWebSocketHandler
├── handleSession()          # 会话入口
├── handleTextMessage()      # 文本消息处理
├── handleBinaryMessage()    # 二进制消息处理
├── handleTransportError()   # 传输错误处理
└── afterConnectionClosed()  # 连接关闭清理
```

**设计要点**:

- **连接管理**: 每个 WebSocket 连接映射到唯一会话
- **消息路由**: 根据消息类型分发到不同处理器
- **背压处理**: 使用 Reactor 的 `onBackpressureBuffer()` 防止消息堆积
- **资源清理**: 连接关闭时自动释放资源

**关键流程**:

```
客户端连接
    ↓
创建会话
    ↓
发送 session.created
    ↓
┌─────────────┐
│ 消息循环     │
│  - 接收消息  │
│  - 处理消息  │
│  - 发送响应  │
└─────────────┘
    ↓
连接关闭
    ↓
清理会话
```

### 2. 会话服务

```
SessionService
├── createSession()      # 创建会话
├── getSession()         # 获取会话
├── updateSession()      # 更新配置
├── deleteSession()      # 删除会话
└── cleanupExpired()     # 清理过期会话
```

**会话状态机**:

```
CREATED → ACTIVE → CLOSED
    ↓        ↓        ↓
  IDLE    BUSY     ERROR
```

**会话数据结构**:

```java
class Session {
    String id;                    // 会话 ID
    String status;                // 状态
    Instant createdAt;            // 创建时间
    Instant lastActivityAt;       // 最后活动时间
    Map<String, Object> config;   // 配置参数
    WebSocketSession wsSession;   // WebSocket 连接
}
```

**并发控制**:

- 使用 `ConcurrentHashMap` 存储会话
- 原子操作确保线程安全
- 读写分离提高性能

### 3. OpenAI 客户端

```
OpenAIClient
├── createRealtimeSession()    # 创建实时会话
├── sendAudioInput()           # 发送音频输入
├── createResponse()           # 请求生成响应
├── cancelResponse()           # 取消响应
└── closeSession()             # 关闭会话
```

**通信模型**:

```
Backend ←─WebSocket─→ OpenAI API
   ↑                      ↑
   │                      │
 JSON                   JSON
   │                      │
   ↓                      ↓
Client ←─WebSocket─→ Backend
```

**消息转发策略**:

- **透明代理**: 大部分消息直接转发
- **协议适配**: 格式转换和字段映射
- **状态同步**: 保持两端会话状态一致

**错误处理**:

```
连接失败 → 指数退避重试 (最多 3 次)
    ↓
超时 → 取消请求，通知客户端
    ↓
API 错误 → 解析错误码，返回友好消息
```

### 4. 音频处理

**编码格式**:

```
原始音频 (PCM16)
    ↓
Byte Array
    ↓
Base64 编码
    ↓
JSON 消息
    ↓
WebSocket 传输
```

**流式处理**:

```java
Flux<AudioChunk>
    .buffer(Duration.ofMillis(100))  // 100ms 缓冲
    .map(chunks -> mergeAudioData(chunks))
    .map(data -> encodeBase64(data))
    .flatMap(encoded -> sendToOpenAI(encoded))
    .subscribe();
```

**优化策略**:

- **分块传输**: 避免大消息阻塞
- **缓冲控制**: 平衡延迟和吞吐量
- **并行处理**: 编码和传输并行执行

---

## 数据流

### 完整对话流程

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Client  │                │ Backend │                │ OpenAI   │
└────┬────┘                └────┬────┘                └────┬─────┘
     │                          │                          │
     │ 1. WebSocket Connect     │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │ 2. session.created       │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     │ 3. session.update        │                          │
     ├─────────────────────────>│                          │
     │                          │ 4. Create Session        │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │ 5. session.created       │
     │                          │<─────────────────────────┤
     │ 6. session.updated       │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     │ 7. audio.input (stream)  │                          │
     ├─────────────────────────>│ 8. Forward audio         │
     ├─────────────────────────>├─────────────────────────>│
     ├─────────────────────────>├─────────────────────────>│
     │                          │                          │
     │ 9. audio.input_complete  │                          │
     ├─────────────────────────>│ 10. Forward complete     │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │ 11. transcription.done   │
     │                          │<─────────────────────────┤
     │ 12. transcription.done   │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     │ 13. response.create      │                          │
     ├─────────────────────────>│ 14. Forward request      │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │ 15. response.audio.start │
     │                          │<─────────────────────────┤
     │ 16. response.audio.start │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     │                          │ 17. audio.delta (stream) │
     │                          │<─────────────────────────┤
     │ 18. audio.delta (stream) │<─────────────────────────┤
     │<─────────────────────────┤<─────────────────────────┤
     │<─────────────────────────┤                          │
     │                          │                          │
     │                          │ 19. response.audio.done  │
     │                          │<─────────────────────────┤
     │ 20. response.audio.done  │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
```

### 消息类型映射

| 客户端消息                 | 后端处理    | OpenAI 消息                 |
| -------------------------- | ----------- | --------------------------- |
| `session.update`           | 验证 + 转换 | `session.update`            |
| `audio.input`              | 透明转发    | `input_audio_buffer.append` |
| `audio.input_complete`     | 触发转写    | `input_audio_buffer.commit` |
| `conversation.item.create` | 添加上下文  | `conversation.item.create`  |
| `response.create`          | 请求响应    | `response.create`           |
| `response.cancel`          | 取消请求    | `response.cancel`           |

### 状态同步

```
Backend Session State ←→ OpenAI Session State
         ↓
    Client State
```

**同步时机**:

- 配置更新时立即同步
- 错误发生时强制同步
- 定期心跳检查状态一致性

---

## 并发模型

### Reactor 线程模型

```
┌──────────────────────────────────────────────┐
│           Netty Event Loop Group             │
│  (Boss Threads + Worker Threads)             │
└────────────┬─────────────────────────────────┘
             │
     ┌───────┴────────┐
     │   Accept       │
     │   Connections  │
     └───────┬────────┘
             │
     ┌───────┴────────────────────────────┐
     │   WebSocket Handler (per conn)     │
     │   - Non-blocking I/O               │
     │   - Event-driven                   │
     └───────┬────────────────────────────┘
             │
     ┌───────┴────────────────────────────┐
     │   Reactive Pipeline (Mono/Flux)    │
     │   - Operator chain                 │
     │   - Backpressure                   │
     └───────┬────────────────────────────┘
             │
     ┌───────┴────────────────────────────┐
     │   Scheduler (Thread Pool)          │
     │   - elastic: I/O operations        │
     │   - parallel: CPU-bound tasks      │
     └────────────────────────────────────┘
```

### 调度器选择

| 操作类型        | 调度器             | 原因         |
| --------------- | ------------------ | ------------ |
| WebSocket I/O   | Event Loop         | 避免线程切换 |
| OpenAI API 调用 | `elastic()`        | I/O 密集型   |
| 音频编码        | `parallel()`       | CPU 密集型   |
| 数据库操作      | `boundedElastic()` | 阻塞 I/O     |

### 背压策略

```java
webSocketSession.receive()
    .onBackpressureBuffer(
        1000,                    // 缓冲区大小
        BufferOverflowStrategy.DROP_OLDEST  // 溢出策略
    )
    .subscribeOn(Schedulers.boundedElastic())
    .subscribe();
```

**策略类型**:

- `DROP_OLDEST`: 丢弃最旧消息（音频流）
- `DROP_LATEST`: 丢弃最新消息（控制消息）
- `ERROR`: 抛出异常（关键消息）

---

## 异常处理

### 异常分类

```
Exception
├── BusinessException (业务异常)
│   ├── SESSION_NOT_FOUND
│   ├── INVALID_CONFIGURATION
│   └── RATE_LIMIT_EXCEEDED
├── IntegrationException (集成异常)
│   ├── OPENAI_API_ERROR
│   ├── NETWORK_TIMEOUT
│   └── CONNECTION_FAILED
└── SystemException (系统异常)
    ├── INTERNAL_ERROR
    └── SERVICE_UNAVAILABLE
```

### 异常处理流程

```
异常发生
    ↓
┌─────────────────┐
│ 本地处理         │
│ - try-catch     │
│ - onErrorResume │
└────┬────────────┘
     │ 未处理
     ↓
┌─────────────────┐
│ 全局处理器       │
│ - 日志记录      │
│ - 错误转换      │
│ - 客户端通知    │
└────┬────────────┘
     │
     ↓
┌─────────────────┐
│ 错误响应         │
│ - 统一格式      │
│ - 错误码        │
│ - 友好消息      │
└─────────────────┘
```

### 错误恢复机制

**重试策略**:

```java
openAIClient.sendRequest(request)
    .retryWhen(Retry.backoff(3, Duration.ofSeconds(1))
        .filter(e -> e instanceof TransientException)
        .onRetryExhaustedThrow((spec, signal) ->
            new IntegrationException("Max retries exceeded")
        )
    );
```

**熔断器**:

```
成功率 < 50% → 半开状态 → 熔断
    ↑                ↓
    └────恢复────────┘
```

**降级方案**:

- OpenAI API 不可用 → 返回预设响应
- 音频处理失败 → 跳过该帧
- 会话存储失败 → 内存临时存储

---

## 性能优化

### 1. 连接复用

```java
WebClient client = WebClient.builder()
    .clientConnector(new ReactorClientHttpConnector(
        HttpClient.create()
            .option(ChannelOption.SO_KEEPALIVE, true)
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)
            .responseTimeout(Duration.ofSeconds(30))
    ))
    .build();
```

**优化点**:

- HTTP Keep-Alive
- WebSocket 连接池
- DNS 缓存

### 2. 内存管理

**堆内存配置**:

```bash
-Xms512m          # 初始堆
-Xmx2g            # 最大堆
-XX:+UseG1GC      # G1 垃圾收集器
```

**对象池**:

```java
ObjectPool<ByteBuffer> bufferPool =
    new GenericObjectPool<>(new ByteBufferFactory());
```

**引用计数**:

- Netty ByteBuf 手动释放
- 及时关闭 Flux/Mono 订阅

### 3. I/O 优化

**零拷贝**:

```java
webSocketSession.send(
    Flux.just(new BinaryMessage(
        DataBufferUtils.allocate(4096)
    ))
);
```

**批量操作**:

```java
Flux.buffer(Duration.ofMillis(100))
    .flatMap(batch -> processBatch(batch));
```

### 4. 缓存策略

**会话缓存**:

- LRU 淘汰
- TTL 过期
- 容量上限 10000

**配置缓存**:

```java
@Cacheable(value = "configs", key = "#sessionId")
public Mono<Config> getConfig(String sessionId) {
    // ...
}
```

---

## 扩展性设计

### 水平扩展

```
                Load Balancer
                      │
        ┌─────────────┼─────────────┐
        │             │             │
    Instance 1    Instance 2    Instance 3
        │             │             │
        └─────────────┼─────────────┘
                      │
                Redis (Session Store)
```

**会话共享**:

- Redis 存储会话状态
- Sticky Session 或 Session 复制
- 分布式锁协调

### 垂直扩展

**资源限制**:

```yaml
resources:
  limits:
    cpu: "2"
    memory: "4Gi"
  requests:
    cpu: "500m"
    memory: "1Gi"
```

**自动伸缩**:

- CPU 使用率 > 70% → 扩容
- 连接数 > 800 → 扩容
- 内存使用率 > 80% → 扩容

### 模块化设计

```
core
├── api           # 接口定义
├── impl          # 实现
└── spi           # 扩展点

plugins
├── audio-codec   # 音频编解码插件
├── storage       # 存储插件
└── monitoring    # 监控插件
```

**插件机制**:

```java
public interface AudioCodec extends SPI {
    byte[] encode(AudioData data);
    AudioData decode(byte[] bytes);
}

// 使用 ServiceLoader 加载
ServiceLoader.load(AudioCodec.class);
```

---

## 监控指标

### 关键指标

| 类别       | 指标         | 目标         |
| ---------- | ------------ | ------------ |
| **性能**   | P99 延迟     | < 500ms      |
|            | 吞吐量       | > 1000 req/s |
| **可用性** | 成功率       | > 99.9%      |
|            | 错误率       | < 0.1%       |
| **资源**   | CPU 使用率   | < 70%        |
|            | 内存使用率   | < 80%        |
| **连接**   | 并发连接数   | 监控         |
|            | 连接建立时间 | < 100ms      |

### 监控集成

```java
@Timed(value = "websocket.message.processing")
public Mono<Void> handleMessage(WebSocketMessage message) {
    return Mono.defer(() -> {
        meterRegistry.counter("websocket.message.received").increment();
        // 处理逻辑
    });
}
```

---

**文档版本**: v1.0.0  
**最后更新**: 2026-08-28
