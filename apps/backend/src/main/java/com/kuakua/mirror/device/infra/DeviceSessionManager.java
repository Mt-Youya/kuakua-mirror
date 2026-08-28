package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.device.domain.DeviceSession;
import com.kuakua.mirror.device.domain.DeviceStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.socket.WebSocketSession;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 设备会话管理器
 */
@Slf4j
@Service
public class DeviceSessionManager {

    private final Map<String, DeviceSession> deviceSessions = new ConcurrentHashMap<>();
    private final Map<String, WebSocketSession> wsSessions = new ConcurrentHashMap<>();

    /**
     * 创建设备会话
     */
    public DeviceSession createSession(String sessionId, String deviceId, String firmwareVersion,
                                        String protocolVersion, java.util.List<String> capabilities) {
        DeviceSession session = DeviceSession.builder()
                .sessionId(sessionId)
                .deviceId(deviceId)
                .firmwareVersion(firmwareVersion)
                .protocolVersion(protocolVersion)
                .capabilities(capabilities)
                .status(DeviceStatus.CONNECTING)
                .connectedAt(System.currentTimeMillis())
                .lastActivityAt(System.currentTimeMillis())
                .build();

        deviceSessions.put(deviceId, session);
        log.info("设备会话创建: deviceId={}, sessionId={}", deviceId, sessionId);
        return session;
    }

    /**
     * 获取设备会话
     */
    public DeviceSession getSession(String deviceId) {
        return deviceSessions.get(deviceId);
    }

    /**
     * 移除设备会话
     */
    public void removeSession(String deviceId) {
        DeviceSession session = deviceSessions.remove(deviceId);
        wsSessions.remove(deviceId);
        if (session != null) {
            log.info("设备会话移除: deviceId={}, sessionId={}", deviceId, session.getSessionId());
        }
    }

    /**
     * 更新设备状态
     */
    public void updateStatus(String deviceId, DeviceStatus status) {
        DeviceSession session = deviceSessions.get(deviceId);
        if (session != null) {
            session.setStatus(status);
            session.updateActivity();
            log.debug("设备状态更新: deviceId={}, status={}", deviceId, status);
        }
    }

    /**
     * 保存WebSocket会话
     */
    public void bindWebSocketSession(String deviceId, WebSocketSession wsSession) {
        wsSessions.put(deviceId, wsSession);
    }

    /**
     * 获取WebSocket会话
     */
    public WebSocketSession getWebSocketSession(String deviceId) {
        return wsSessions.get(deviceId);
    }

    /**
     * 更新活动时间
     */
    public void updateActivity(String deviceId) {
        DeviceSession session = deviceSessions.get(deviceId);
        if (session != null) {
            session.updateActivity();
        }
    }

    /**
     * 检查会话是否存在
     */
    public boolean hasSession(String deviceId) {
        return deviceSessions.containsKey(deviceId);
    }

    /**
     * 获取所有在线设备ID
     */
    public java.util.Set<String> getOnlineDeviceIds() {
        return deviceSessions.keySet();
    }
}
