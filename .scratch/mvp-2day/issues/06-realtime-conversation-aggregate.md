# 06: RealtimeConversation 聚合根

**What to build:** 创建 `RealtimeConversation` 聚合根类，实现对话状态机（LISTENING → TRANSCRIBING → GENERATING → RESPONDING → COMPLETED）。包含音频缓冲、状态转换方法、领域事件发布。编写单元测试验证状态机转换的正确性。

**Blocked by:** Ticket 01

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] 创建 `RealtimeConversation.java` 类（属性：conversationId, status, audioBuffer, transcript, responseText）
- [ ] 实现方法：`appendAudio()`, `completeAudioInput()`, `transcriptionCompleted()`, `responseGenerated()`, `complete()`
- [ ] 状态转换只能按顺序进行，非法转换抛出 `IllegalStateException`
- [ ] 状态转换时发布领域事件（如 `AudioInputCompleted`, `TranscriptionCompleted`）
- [ ] 编写单元测试，覆盖所有合法和非法状态转换场景
- [ ] 测试通过：`./mvnw test -Dtest=RealtimeConversationTest`
