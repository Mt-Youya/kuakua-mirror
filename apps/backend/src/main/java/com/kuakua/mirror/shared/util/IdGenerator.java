package com.kuakua.mirror.shared.util;

import java.util.UUID;

/**
 * ID 生成工具类
 */
public class IdGenerator {

    /**
     * 生成通用 ID
     */
    public static String generateId() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * 生成事件 ID
     */
    public static String generateEventId() {
        return "event_" + UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * 生成会话 ID
     */
    public static String generateSessionId() {
        return "sess_" + UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * 生成对话项 ID
     */
    public static String generateItemId() {
        return "item_" + UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * 生成响应 ID
     */
    public static String generateResponseId() {
        return "resp_" + UUID.randomUUID().toString().replace("-", "");
    }
}
