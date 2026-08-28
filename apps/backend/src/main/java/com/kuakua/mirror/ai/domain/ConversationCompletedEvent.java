package com.kuakua.mirror.ai.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 对话完成事件
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConversationCompletedEvent {
    private String conversationId;
}
