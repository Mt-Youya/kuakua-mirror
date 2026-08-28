package com.kuakua.mirror.conversation.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false, length = 64)
    private String sessionId;

    @Column(name = "device_id", nullable = false, length = 64)
    private String deviceId;

    @Column(name = "moment_id")
    private Long momentId;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private Role role;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "audio_url", length = 500)
    private String audioUrl;

    @Column(name = "audio_duration_seconds")
    private Integer audioDurationSeconds;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum Role {
        USER,      // 用户消息
        ASSISTANT  // AI 回复
    }
}
