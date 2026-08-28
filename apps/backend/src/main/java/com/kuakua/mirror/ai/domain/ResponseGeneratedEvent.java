package com.kuakua.mirror.ai.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 响应生成完成事件
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResponseGeneratedEvent {
    private String conversationId;
    private String responseText;
}
