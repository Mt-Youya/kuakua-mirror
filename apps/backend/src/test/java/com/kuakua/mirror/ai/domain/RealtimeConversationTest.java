package com.kuakua.mirror.ai.domain;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * RealtimeConversation 聚合根单元测试
 */
@DisplayName("RealtimeConversation 聚合根测试")
class RealtimeConversationTest {

    private RealtimeConversation conversation;
    private static final String CONVERSATION_ID = "conv-12345";
    private static final String AUDIO_DATA = "base64AudioData";
    private static final String TRANSCRIPT = "你好，这是测试文本";
    private static final String RESPONSE_TEXT = "你好！我是AI助手";

    @BeforeEach
    void setUp() {
        conversation = RealtimeConversation.builder()
                .conversationId(CONVERSATION_ID)
                .status(ConversationStatus.LISTENING)
                .build();
    }

    @Test
    @DisplayName("正常流程：完整状态转换")
    void testHappyPath_CompleteStateTransition() {
        // LISTENING -> 追加音频
        conversation.appendAudio(AUDIO_DATA);
        assertEquals(AUDIO_DATA, conversation.getAudioBuffer());
        assertEquals(ConversationStatus.LISTENING, conversation.getStatus());

        // LISTENING -> TRANSCRIBING
        conversation.completeAudioInput();
        assertEquals(ConversationStatus.TRANSCRIBING, conversation.getStatus());
        assertEquals(1, conversation.getDomainEvents().size());
        assertTrue(conversation.getDomainEvents().get(0) instanceof AudioInputCompletedEvent);

        // TRANSCRIBING -> GENERATING
        conversation.transcriptionCompleted(TRANSCRIPT);
        assertEquals(TRANSCRIPT, conversation.getTranscript());
        assertEquals(ConversationStatus.GENERATING, conversation.getStatus());
        assertEquals(2, conversation.getDomainEvents().size());
        assertTrue(conversation.getDomainEvents().get(1) instanceof TranscriptionCompletedEvent);

        // GENERATING -> RESPONDING
        conversation.responseGenerated(RESPONSE_TEXT);
        assertEquals(RESPONSE_TEXT, conversation.getResponseText());
        assertEquals(ConversationStatus.RESPONDING, conversation.getStatus());
        assertEquals(3, conversation.getDomainEvents().size());
        assertTrue(conversation.getDomainEvents().get(2) instanceof ResponseGeneratedEvent);

        // RESPONDING -> COMPLETED
        conversation.complete();
        assertEquals(ConversationStatus.COMPLETED, conversation.getStatus());
        assertEquals(4, conversation.getDomainEvents().size());
        assertTrue(conversation.getDomainEvents().get(3) instanceof ConversationCompletedEvent);
    }

    @Test
    @DisplayName("追加音频：可以多次追加")
    void testAppendAudio_MultipleAppends() {
        conversation.appendAudio("part1");
        conversation.appendAudio("part2");
        conversation.appendAudio("part3");

        assertEquals("part1part2part3", conversation.getAudioBuffer());
        assertEquals(ConversationStatus.LISTENING, conversation.getStatus());
    }

    @Test
    @DisplayName("非法转换：在非LISTENING状态追加音频")
    void testAppendAudio_InvalidState() {
        conversation.completeAudioInput();

        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> conversation.appendAudio(AUDIO_DATA));

        assertTrue(exception.getMessage().contains("appendAudio"));
        assertTrue(exception.getMessage().contains("LISTENING"));
        assertTrue(exception.getMessage().contains("TRANSCRIBING"));
    }

    @Test
    @DisplayName("非法转换：在非LISTENING状态完成音频输入")
    void testCompleteAudioInput_InvalidState() {
        conversation.completeAudioInput();

        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> conversation.completeAudioInput());

        assertTrue(exception.getMessage().contains("completeAudioInput"));
        assertTrue(exception.getMessage().contains("LISTENING"));
    }

    @Test
    @DisplayName("非法转换：在非TRANSCRIBING状态完成转写")
    void testTranscriptionCompleted_InvalidState() {
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> conversation.transcriptionCompleted(TRANSCRIPT));

        assertTrue(exception.getMessage().contains("transcriptionCompleted"));
        assertTrue(exception.getMessage().contains("TRANSCRIBING"));
        assertTrue(exception.getMessage().contains("LISTENING"));
    }

    @Test
    @DisplayName("非法转换：在非GENERATING状态生成响应")
    void testResponseGenerated_InvalidState() {
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> conversation.responseGenerated(RESPONSE_TEXT));

        assertTrue(exception.getMessage().contains("responseGenerated"));
        assertTrue(exception.getMessage().contains("GENERATING"));
    }

    @Test
    @DisplayName("非法转换：在非RESPONDING状态完成对话")
    void testComplete_InvalidState() {
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> conversation.complete());

        assertTrue(exception.getMessage().contains("complete"));
        assertTrue(exception.getMessage().contains("RESPONDING"));
    }

    @Test
    @DisplayName("非法转换：跳过状态")
    void testSkipStates_NotAllowed() {
        // 尝试从 LISTENING 直接跳到 GENERATING
        conversation.completeAudioInput(); // -> TRANSCRIBING

        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> conversation.responseGenerated(RESPONSE_TEXT));

        assertTrue(exception.getMessage().contains("GENERATING"));
    }

    @Test
    @DisplayName("领域事件：验证事件内容")
    void testDomainEvents_Content() {
        conversation.appendAudio(AUDIO_DATA);
        conversation.completeAudioInput();

        AudioInputCompletedEvent event = (AudioInputCompletedEvent) conversation.getDomainEvents().get(0);
        assertEquals(CONVERSATION_ID, event.getConversationId());
        assertEquals(AUDIO_DATA, event.getAudioBuffer());
    }

    @Test
    @DisplayName("领域事件：清空事件")
    void testDomainEvents_Clear() {
        conversation.completeAudioInput();
        assertEquals(1, conversation.getDomainEvents().size());

        conversation.clearDomainEvents();
        assertEquals(0, conversation.getDomainEvents().size());
    }

    @Test
    @DisplayName("领域事件：返回只读副本")
    void testDomainEvents_Immutable() {
        conversation.completeAudioInput();

        java.util.List<Object> events = conversation.getDomainEvents();
        events.clear();

        // 原始事件列表不应受影响
        assertEquals(1, conversation.getDomainEvents().size());
    }

    @Test
    @DisplayName("状态不可回退")
    void testNoBackwardTransition() {
        // 完整流程
        conversation.completeAudioInput();
        conversation.transcriptionCompleted(TRANSCRIPT);
        conversation.responseGenerated(RESPONSE_TEXT);

        // 尝试回退到 TRANSCRIBING 状态
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> conversation.transcriptionCompleted("another text"));

        assertTrue(exception.getMessage().contains("TRANSCRIBING"));
        assertTrue(exception.getMessage().contains("RESPONDING"));
    }

    @Test
    @DisplayName("完成后不可再操作")
    void testNoOperationAfterCompletion() {
        // 完整流程到完成
        conversation.completeAudioInput();
        conversation.transcriptionCompleted(TRANSCRIPT);
        conversation.responseGenerated(RESPONSE_TEXT);
        conversation.complete();

        // 尝试再次完成
        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> conversation.complete());

        assertTrue(exception.getMessage().contains("complete"));
        assertTrue(exception.getMessage().contains("RESPONDING"));
        assertTrue(exception.getMessage().contains("COMPLETED"));
    }
}
