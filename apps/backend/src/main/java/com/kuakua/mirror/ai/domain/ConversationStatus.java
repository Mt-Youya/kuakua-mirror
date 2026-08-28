package com.kuakua.mirror.ai.domain;

/**
 * 实时对话状态枚举
 */
public enum ConversationStatus {
    /**
     * 监听中 - 正在接收音频输入
     */
    LISTENING,

    /**
     * 转写中 - 正在将音频转换为文本
     */
    TRANSCRIBING,

    /**
     * 生成中 - 正在生成AI响应
     */
    GENERATING,

    /**
     * 响应中 - 正在播放响应
     */
    RESPONDING,

    /**
     * 已完成 - 对话轮次结束
     */
    COMPLETED
}
