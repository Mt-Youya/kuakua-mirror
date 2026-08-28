package com.kuakua.mirror.ai.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 实时对话聚合根
 * 管理单个对话轮次的完整生命周期
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "realtime_conversations")
public class RealtimeConversation {

    @Id
    @Column(name = "conversation_id", nullable = false, length = 64)
    private String conversationId;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ConversationStatus status;

    /**
     * 音频缓冲区（存储base64编码的音频数据）
     */
    @Column(name = "audio_buffer", columnDefinition = "TEXT")
    private String audioBuffer;

    /**
     * 转写文本
     */
    @Column(columnDefinition = "TEXT")
    private String transcript;

    /**
     * AI响应文本
     */
    @Column(name = "response_text", columnDefinition = "TEXT")
    private String responseText;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * 领域事件列表（不持久化）
     */
    @Transient
    @Builder.Default
    private List<Object> domainEvents = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * 追加音频数据
     */
    public void appendAudio(String audioData) {
        validateStatus(ConversationStatus.LISTENING, "appendAudio");

        if (audioBuffer == null) {
            audioBuffer = audioData;
        } else {
            audioBuffer += audioData;
        }
    }

    /**
     * 完成音频输入，转换到转写状态
     */
    public void completeAudioInput() {
        validateStatus(ConversationStatus.LISTENING, "completeAudioInput");

        this.status = ConversationStatus.TRANSCRIBING;
        this.domainEvents.add(new AudioInputCompletedEvent(conversationId, audioBuffer));
    }

    /**
     * 转写完成
     */
    public void transcriptionCompleted(String transcript) {
        validateStatus(ConversationStatus.TRANSCRIBING, "transcriptionCompleted");

        this.transcript = transcript;
        this.status = ConversationStatus.GENERATING;
        this.domainEvents.add(new TranscriptionCompletedEvent(conversationId, transcript));
    }

    /**
     * 响应生成完成
     */
    public void responseGenerated(String responseText) {
        validateStatus(ConversationStatus.GENERATING, "responseGenerated");

        this.responseText = responseText;
        this.status = ConversationStatus.RESPONDING;
        this.domainEvents.add(new ResponseGeneratedEvent(conversationId, responseText));
    }

    /**
     * 完成整个对话轮次
     */
    public void complete() {
        validateStatus(ConversationStatus.RESPONDING, "complete");

        this.status = ConversationStatus.COMPLETED;
        this.domainEvents.add(new ConversationCompletedEvent(conversationId));
    }

    /**
     * 验证当前状态是否允许执行操作
     */
    private void validateStatus(ConversationStatus expectedStatus, String operation) {
        if (this.status != expectedStatus) {
            throw new IllegalStateException(
                String.format("Cannot execute %s: expected status %s but was %s",
                    operation, expectedStatus, this.status)
            );
        }
    }

    /**
     * 清空领域事件
     */
    public void clearDomainEvents() {
        this.domainEvents.clear();
    }

    /**
     * 获取领域事件的只读副本
     */
    public List<Object> getDomainEvents() {
        return new ArrayList<>(domainEvents);
    }
}
