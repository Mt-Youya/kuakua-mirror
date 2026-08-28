package com.kuakua.mirror.device.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 设备WebSocket会话
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceSession {

    private String sessionId;

    private String deviceId;

    private String firmwareVersion;

    private String protocolVersion;

    private List<String> capabilities;

    private DeviceStatus status;

    private Long connectedAt;

    private Long lastActivityAt;

    @Builder.Default
    private ConcurrentHashMap<String, Object> attributes = new ConcurrentHashMap<>();

    public void setAttribute(String key, Object value) {
        attributes.put(key, value);
    }

    public Object getAttribute(String key) {
        return attributes.get(key);
    }

    public void updateActivity() {
        this.lastActivityAt = System.currentTimeMillis();
    }
}
