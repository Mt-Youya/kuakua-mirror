# ADR-002: RealtimeConversation 作为对话流程的聚合根

**状态**: 已接受  
**日期**: 2026-08-28  
**决策者**: 开发团队  

## 背景

实时语音对话流程涉及多个状态和步骤：
1. 音频输入缓冲
2. 语音识别（ASR）
3. 大模型生成回复
4. 语音合成（TTS）
5. 音频输出流式传输

初始实现中，这些状态分散在 `DeviceSession` 和各个服务类中，导致：
- 状态管理混乱，难以追踪对话流程
- 并发控制困难（一个设备同时多个对话）
- 错误恢复逻辑复杂（哪一步失败了？如何回滚？）
- 难以测试完整的对话流程

## 决策

创建 `RealtimeConversation` 聚合根，封装一次对话轮次的完整生命周期。

### 职责边界

**RealtimeConversation（聚合根）**：
- 管理对话状态机：LISTENING → TRANSCRIBING → GENERATING → RESPONDING → COMPLETED
- 缓冲音频数据直到输入结束
- 协调 OpenAI Realtime API 调用
- 发布领域事件：TranscriptionCompleted、ResponseGenerated 等
- 确保状态一致性（如：不能在 LISTENING 时调用生成回复）

**DeviceSession**：
- 只管理 WebSocket 连接状态
- 路由消息到对应的 RealtimeConversation
- 不包含对话业务逻辑

**Message（实体）**：
- 持久化的对话记录
- RealtimeConversation 完成后创建
- 不可变，只读

### 状态机

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

### 并发策略

- 一个设备同时只能有一个 ACTIVE 的 RealtimeConversation
- 尝试创建新对话时，如果已有 ACTIVE 对话：
  - 选项 A：自动终止旧对话（用户打断）
  - 选项 B：拒绝新对话，返回错误
  - **MVP 选择 A**：用户可以随时打断 AI

### 存储

- **运行时**：内存（ConcurrentHashMap，key = conversationId）
- **完成后**：持久化为 Message 记录到数据库
- **清理策略**：COMPLETED 状态保留 5 分钟后清理（用于查询最近对话）

## 替代方案

### 方案 1：无状态处理
每个 WebSocket 消息独立处理，不维护对话状态。

**优点**：
- 实现简单
- 天然支持水平扩展

**缺点**：
- 无法处理多步骤流程（如：音频分片上传）
- 错误恢复困难
- 无法提供中间状态（如："正在识别中..."）

**为什么拒绝**：实时对话本质上是有状态的，强行做成无状态会把复杂度推给客户端。

### 方案 2：DeviceSession 包含对话逻辑
把对话状态和逻辑放在 DeviceSession 中。

**优点**：
- 少一个类

**缺点**：
- 违反单一职责原则
- DeviceSession 职责过重
- 难以支持一个设备多个对话（如：APP 和硬件同时连接）

**为什么拒绝**：连接管理和对话流程是两个不同的关注点，应该分离。

## 后果

### 正面
- 清晰的状态机，易于理解和调试
- 领域事件使得状态变化可观测（监控页面可以实时显示）
- 易于测试：可以模拟各种状态转换场景
- 易于扩展：未来可以支持多轮上下文、对话分支等

### 负面
- 多一层抽象，代码行数增加
- 需要管理内存中的聚合生命周期（创建、清理）
- 需要小心处理并发（状态转换的原子性）

### 风险缓解
- 使用状态机模式库（如 Spring State Machine）减少手写状态转换逻辑
- 设置超时机制：如果对话卡在某个状态超过 30 秒，自动标记为 FAILED
- 定期清理 COMPLETED 状态的聚合，避免内存泄漏

## 实现要点

```java
public class RealtimeConversation {
    private final String conversationId;
    private ConversationStatus status;
    private final List<AudioChunk> audioBuffer;
    private String transcript;
    private String responseText;
    private byte[] responseAudio;
    
    public void appendAudio(AudioChunk chunk) {
        if (status != ConversationStatus.LISTENING) {
            throw new IllegalStateException("Cannot append audio in status: " + status);
        }
        audioBuffer.add(chunk);
    }
    
    public void completeAudioInput() {
        if (status != ConversationStatus.LISTENING) {
            throw new IllegalStateException("Cannot complete audio in status: " + status);
        }
        status = ConversationStatus.TRANSCRIBING;
        publishEvent(new AudioInputCompleted(conversationId, audioBuffer));
    }
    
    public void transcriptionCompleted(String text) {
        if (status != ConversationStatus.TRANSCRIBING) {
            throw new IllegalStateException("Invalid state transition");
        }
        this.transcript = text;
        status = ConversationStatus.GENERATING;
        publishEvent(new TranscriptionCompleted(conversationId, text));
    }
    
    // ... 其他状态转换方法
}
```

## 相关决策

- ADR-003：硬件简化协议设计（定义硬件如何触发 RealtimeConversation 的创建）
- ADR-004：Message 持久化策略（RealtimeConversation 完成后如何转为 Message）
