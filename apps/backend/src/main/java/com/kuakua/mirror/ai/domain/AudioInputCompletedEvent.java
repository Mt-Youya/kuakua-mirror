package com.kuakua.mirror.ai.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 音频输入完成事件
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AudioInputCompletedEvent {
    private String conversationId;
    private String audioBuffer;
}
