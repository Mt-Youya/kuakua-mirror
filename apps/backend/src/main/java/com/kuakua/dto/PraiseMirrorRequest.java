package com.kuakua.dto;

import lombok.Data;

/**
 * 夸夸镜请求
 */
@Data
public class PraiseMirrorRequest {
    /**
     * 用户照片（base64 或 URL）
     */
    private String imageData;

    /**
     * 近期对话文本（可选，用于 P_voice 阶段）
     */
    private String dialogueText;

    /**
     * 是否使用预计算缓存（默认 false）
     */
    private Boolean useCache = false;
}
