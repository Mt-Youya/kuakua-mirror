package com.kuakua.mirror.ai.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 转写完成事件
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TranscriptionCompletedEvent {
    private String conversationId;
    private String transcript;
}
