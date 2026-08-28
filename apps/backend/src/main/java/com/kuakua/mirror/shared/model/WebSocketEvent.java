package com.kuakua.mirror.shared.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * WebSocket 事件基类
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketEvent {

    /**
     * 事件类型
     */
    private String type;

    /**
     * 事件ID（可选）
     */
    private String eventId;

    /**
     * 事件数据
     */
    private Object data;
}
