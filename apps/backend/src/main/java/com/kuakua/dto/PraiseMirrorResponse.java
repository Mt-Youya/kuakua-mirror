package com.kuakua.dto;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;
import lombok.Data;

/**
 * 夸夸镜响应
 */
@Data
@Builder
public class PraiseMirrorResponse {
    /**
     * 最终夸夸句
     */
    private String praiseSentence;

    /**
     * 语音文件 URL（TTS 生成后）
     */
    private String audioUrl;

    /**
     * P1 视觉标签（调试用）
     */
    private JsonNode visualTags;

    /**
     * P_voice 对话洞察（调试用）
     */
    private JsonNode voiceInsights;

    /**
     * 是否通过质量闸门
     */
    private Boolean passedValidation;

    /**
     * 重跑次数（0-2）
     */
    private Integer retryCount;

    /**
     * 处理耗时（毫秒）
     */
    private Long processingTimeMs;

    /**
     * 是否使用了兜底句
     */
    private Boolean isFallback;
}
