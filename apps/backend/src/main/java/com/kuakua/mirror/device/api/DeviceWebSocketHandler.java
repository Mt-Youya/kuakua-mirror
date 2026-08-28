package com.kuakua.mirror.device.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kuakua.mirror.ai.infra.realtime.OpenAIRealtimeMessage;
import com.kuakua.mirror.device.domain.DeviceSession;
import com.kuakua.mirror.device.domain.DeviceStatus;
import com.kuakua.mirror.device.dto.DeviceMessage;
import com.kuakua.mirror.device.infra.DeviceProtocolAdapter;
import com.kuakua.mirror.device.infra.DeviceSessionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

/**
 * 设备WebSocket处理器
 *
 * 处理硬件设备的 WebSocket 连接，支持以下消息类型：
 * - device_info: 设备信息
 * - heartbeat: 心跳
 * - audio: 音频数据
 * - audio_end: 音频结束
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DeviceWebSocketHandler implements WebSocketHandler {

    private final DeviceSessionManager sessionManager;
    private final DeviceProtocolAdapter protocolAdapter;
    private final ObjectMapper objectMapper;

    @Override
    public Mono<Void> handle(WebSocketSession wsSession) {
        String wsSessionId = wsSession.getId();
        log.info("设备WebSocket连接建立: wsSessionId={}", wsSessionId);

        // 创建消息发送通道
        Sinks.Many<String> outputSink = Sinks.many().multicast().onBackpressureBuffer();

        // 接收设备消息
        Flux<DeviceMessage> incomingMessages = wsSession.receive()
                .map(WebSocketMessage::getPayloadAsText)
                .flatMap(this::parseDeviceMessage)
                .doOnNext(msg -> log.debug("收到设备消息: type={}", msg.getType()));

        // 处理消息并生成响应
        Flux<WebSocketMessage> outgoingMessages = incomingMessages
                .flatMap(msg -> handleDeviceMessage(wsSession, msg, outputSink))
                .mergeWith(outputSink.asFlux().map(wsSession::textMessage))
                .onErrorResume(error -> {
                    log.error("处理设备消息时出错: wsSessionId={}", wsSessionId, error);
                    return sendDeviceError(wsSession, "INTERNAL_ERROR", error.getMessage());
                });

        // 发送响应并处理连接关闭
        return wsSession.send(outgoingMessages)
                .doOnTerminate(() -> {
                    log.info("设备WebSocket连接关闭: wsSessionId={}", wsSessionId);
                    String deviceId = (String) wsSession.getAttributes().get("deviceId");
                    if (deviceId != null) {
                        sessionManager.removeSession(deviceId);
                        log.info("设备会话已清理: deviceId={}", deviceId);
                    }
                });
    }

    /**
     * 解析设备消息
     */
    private Mono<DeviceMessage> parseDeviceMessage(String json) {
        return Mono.fromCallable(() -> objectMapper.readValue(json, DeviceMessage.class))
                .onErrorResume(error -> {
                    log.error("设备消息JSON解析失败: {}", error.getMessage());
                    return Mono.empty();
                });
    }

    /**
     * 处理设备消息
     */
    private Flux<WebSocketMessage> handleDeviceMessage(WebSocketSession wsSession,
                                                        DeviceMessage deviceMsg,
                                                        Sinks.Many<String> outputSink) {
        String type = deviceMsg.getType();
        if (type == null) {
            log.warn("设备消息类型为空");
            return Flux.empty();
        }

        return switch (type) {
            case "device_info" -> handleDeviceInfo(wsSession, deviceMsg, outputSink);
            case "heartbeat" -> handleHeartbeat(wsSession, deviceMsg);
            case "audio" -> handleAudio(wsSession, deviceMsg, outputSink);
            case "audio_end" -> handleAudioEnd(wsSession, deviceMsg, outputSink);
            default -> {
                log.warn("未知设备消息类型: type={}", type);
                yield Flux.empty();
            }
        };
    }

    /**
     * 处理 device_info 消息
     * 创建 DeviceSession 并存入内存
     */
    private Flux<WebSocketMessage> handleDeviceInfo(WebSocketSession wsSession,
                                                      DeviceMessage deviceMsg,
                                                      Sinks.Many<String> outputSink) {
        String deviceId = deviceMsg.getDeviceId();
        String firmwareVersion = deviceMsg.getFirmwareVersion();
        java.util.List<String> capabilities = deviceMsg.getCapabilities();

        log.info("设备信息: deviceId={}, firmware={}, capabilities={}",
                 deviceId, firmwareVersion, capabilities);

        // 创建设备会话
        String sessionId = "sess_" + System.currentTimeMillis();
        DeviceSession deviceSession = sessionManager.createSession(
                sessionId, deviceId, firmwareVersion, "1.0", capabilities
        );

        // 保存 deviceId 到 WebSocket session attributes
        wsSession.getAttributes().put("deviceId", deviceId);

        // 绑定 WebSocket 会话
        sessionManager.bindWebSocketSession(deviceId, wsSession);

        // 更新状态为 IDLE
        sessionManager.updateStatus(deviceId, DeviceStatus.IDLE);

        // 保存输出通道到会话属性，用于后续推送消息
        wsSession.getAttributes().put("outputSink", outputSink);

        log.info("设备会话已创建: deviceId={}, sessionId={}", deviceId, sessionId);

        return Flux.empty();
    }

    /**
     * 处理 heartbeat 消息
     * 更新 lastActivityAt 并响应 pong
     */
    private Flux<WebSocketMessage> handleHeartbeat(WebSocketSession wsSession, DeviceMessage deviceMsg) {
        String deviceId = (String) wsSession.getAttributes().get("deviceId");
        if (deviceId == null) {
            log.warn("收到心跳但设备未注册: wsSessionId={}", wsSession.getId());
            return Flux.empty();
        }

        // 更新活动时间
        sessionManager.updateActivity(deviceId);

        log.debug("收到心跳: deviceId={}, timestamp={}", deviceId, deviceMsg.getTimestamp());

        // 响应 pong
        DeviceMessage pongMsg = DeviceMessage.pong(System.currentTimeMillis());
        return sendDeviceMessage(wsSession, pongMsg);
    }

    /**
     * 处理 audio 消息
     * 调用 DeviceProtocolAdapter 转换，转发给 RealtimeConversation
     */
    private Flux<WebSocketMessage> handleAudio(WebSocketSession wsSession,
                                                 DeviceMessage deviceMsg,
                                                 Sinks.Many<String> outputSink) {
        String deviceId = (String) wsSession.getAttributes().get("deviceId");
        if (deviceId == null) {
            log.warn("收到音频但设备未注册: wsSessionId={}", wsSession.getId());
            return Flux.empty();
        }

        // 更新活动时间
        sessionManager.updateActivity(deviceId);

        log.debug("收到音频数据: deviceId={}, dataLength={}",
                  deviceId, deviceMsg.getData() != null ? deviceMsg.getData().length() : 0);

        // 使用 DeviceProtocolAdapter 转换为 OpenAI 消息
        OpenAIRealtimeMessage openAIMsg = protocolAdapter.translateToOpenAI(deviceMsg);

        if (openAIMsg != null) {
            log.debug("音频消息已转换为OpenAI格式: type={}", openAIMsg.getType());
            // TODO: 在 Ticket 09 中实现转发到 RealtimeConversation
            // realtimeConversation.sendToOpenAI(openAIMsg);
        }

        return Flux.empty();
    }

    /**
     * 处理 audio_end 消息
     * 标志音频输入结束，提交到 OpenAI 处理
     */
    private Flux<WebSocketMessage> handleAudioEnd(WebSocketSession wsSession,
                                                    DeviceMessage deviceMsg,
                                                    Sinks.Many<String> outputSink) {
        String deviceId = (String) wsSession.getAttributes().get("deviceId");
        if (deviceId == null) {
            log.warn("收到音频结束但设备未注册: wsSessionId={}", wsSession.getId());
            return Flux.empty();
        }

        // 更新活动时间
        sessionManager.updateActivity(deviceId);

        log.info("音频输入结束: deviceId={}", deviceId);

        // 使用 DeviceProtocolAdapter 转换为 OpenAI 消息
        OpenAIRealtimeMessage openAIMsg = protocolAdapter.translateToOpenAI(deviceMsg);

        if (openAIMsg != null) {
            log.debug("音频结束消息已转换为OpenAI格式: type={}", openAIMsg.getType());
            // TODO: 在 Ticket 09 中实现转发到 RealtimeConversation
            // realtimeConversation.sendToOpenAI(openAIMsg);
        }

        return Flux.empty();
    }

    /**
     * 发送设备消息
     */
    private Flux<WebSocketMessage> sendDeviceMessage(WebSocketSession wsSession, DeviceMessage deviceMsg) {
        try {
            String json = objectMapper.writeValueAsString(deviceMsg);
            return Flux.just(wsSession.textMessage(json));
        } catch (Exception e) {
            log.error("序列化设备消息失败: type={}", deviceMsg.getType(), e);
            return Flux.empty();
        }
    }

    /**
     * 发送错误消息
     */
    private Flux<WebSocketMessage> sendDeviceError(WebSocketSession wsSession, String code, String message) {
        DeviceMessage errorMsg = DeviceMessage.error(code, message);
        return sendDeviceMessage(wsSession, errorMsg);
    }
}
