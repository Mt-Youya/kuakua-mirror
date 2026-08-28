package com.kuakua.mirror.conversation.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 对话会话实体
 */
@Entity
@Table(name = "conversation_sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationSession {

    @Id
    @Column(name = "session_id", length = 64)
    private String sessionId;

    @Column(name = "device_id", nullable = false, length = 64)
    private String deviceId;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private SessionStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum SessionStatus {
        ACTIVE,    // 活跃中
        ENDED,     // 已结束
        TIMEOUT    // 超时结束
    }
}
