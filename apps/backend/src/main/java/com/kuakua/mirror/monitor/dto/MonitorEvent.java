package com.kuakua.mirror.monitor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * 监控事件数据传输对象
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonitorEvent {

    /**
     * 事件类型
     */
    private String eventType;

    /**
     * 时间戳
     */
    private Long timestamp;

    /**
     * 事件数据
     */
    private Map<String, Object> data;

    /**
     * 创建设备连接事件
     */
    public static MonitorEvent deviceConnected(String deviceId) {
        return MonitorEvent.builder()
                .eventType("device_connected")
                .timestamp(System.currentTimeMillis())
                .data(Map.of("deviceId", deviceId))
                .build();
    }

    /**
     * 创建设备断开事件
     */
    public static MonitorEvent deviceDisconnected(String deviceId) {
        return MonitorEvent.builder()
                .eventType("device_disconnected")
                .timestamp(System.currentTimeMillis())
                .data(Map.of("deviceId", deviceId))
                .build();
    }

    /**
     * 创建用户消息事件
     */
    public static MonitorEvent userMessage(String deviceId, String text) {
        return MonitorEvent.builder()
                .eventType("user_message")
                .timestamp(System.currentTimeMillis())
                .data(Map.of(
                        "deviceId", deviceId,
                        "text", text
                ))
                .build();
    }

    /**
     * 创建AI回复事件
     */
    public static MonitorEvent assistantMessage(String deviceId, String text) {
        return MonitorEvent.builder()
                .eventType("assistant_message")
                .timestamp(System.currentTimeMillis())
                .data(Map.of(
                        "deviceId", deviceId,
                        "text", text
                ))
                .build();
    }
}
