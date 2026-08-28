package com.kuakua.mirror.conversation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 会话消息 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationMessageDto {

    private Long id;
    private String role;
    private String content;
    private LocalDateTime createdAt;
}
