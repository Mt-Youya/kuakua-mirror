package com.kuakua.mirror.conversation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 发送消息响应
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageResponse {

    private ConversationMessageDto userMessage;
    private ConversationMessageDto assistantMessage;
}
