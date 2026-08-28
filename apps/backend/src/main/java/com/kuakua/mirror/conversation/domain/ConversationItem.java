package com.kuakua.mirror.conversation.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * 对话项
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationItem {

    /**
     * 项ID
     */
    private String id;

    /**
     * 项类型: message, function_call, function_call_output
     */
    private String type;

    /**
     * 角色: user, assistant, system
     */
    private String role;

    /**
     * 内容列表
     */
    private List<ContentPart> content;

    /**
     * 状态: completed, in_progress, incomplete
     */
    private String status;

    /**
     * 内容部分
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContentPart {
        /**
         * 内容类型: input_text, input_audio, text, audio
         */
        private String type;

        /**
         * 文本内容
         */
        private String text;

        /**
         * 音频数据（base64编码）
         */
        private String audio;

        /**
         * 转录文本
         */
        private String transcript;
    }
}
