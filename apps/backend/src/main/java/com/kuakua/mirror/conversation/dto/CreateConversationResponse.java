package com.kuakua.mirror.conversation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 创建会话响应
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateConversationResponse {

    private String sessionId;
    private Long momentId;
    private Long userId;
}
