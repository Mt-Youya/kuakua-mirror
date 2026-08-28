package com.kuakua.mirror.audio.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kuakua.mirror.ai.infra.OpenAIRealtimeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import reactor.core.Disposable;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class AudioWebSocketHandler extends TextWebSocketHandler {

    private final OpenAIRealtimeService openAIRealtimeService;
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, String> sessionToOpenAI = new ConcurrentHashMap<>();
    private final Map<String, Disposable> messageSubscriptions = new ConcurrentHashMap<>();
    private final Map<String, Long> lastHeartbeatTime = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final long HEARTBEAT_INTERVAL_MS = 30000; // 30 秒
    private static final long HEARTBEAT_TIMEOUT_MS = 60000; // 60 秒超时

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.put(session.getId(), session);
        lastHeartbeatTime.put(session.getId(), System.currentTimeMillis());
        log.info("WebSocket 连接建立: sessionId={}", session.getId());

        // 发送欢迎消息
        sendMessage(session, Map.of(
            "type", "hello",
            "sessionId", session.getId(),
            "timestamp", System.currentTimeMillis()
        ));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        log.debug("收到消息: sessionId={}, payload={}", session.getId(), payload);

        try {
            JsonNode node = objectMapper.readTree(payload);
            String type = node.get("type").asText();

            switch (type) {
                case "listen":
                    handleListen(session, node);
                    break;
                case "abort":
                    handleAbort(session, node);
                    break;
                case "audio":
                    handleAudio(session, node);
                    break;
                case "ping":
                    handlePing(session);
                    break;
                default:
                    log.warn("未知消息类型: {}", type);
                    sendError(session, "unknown_type", "未知的消息类型: " + type);
            }
        } catch (Exception e) {
            log.error("处理消息失败: sessionId={}", session.getId(), e);
            sendError(session, "parse_error", "消息解析失败: " + e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String sessionId = session.getId();

        // 清理 OpenAI 会话
        String openAISessionId = sessionToOpenAI.remove(sessionId);
        if (openAISessionId != null) {
            openAIRealtimeService.closeSession(openAISessionId);
            log.info("已关闭 OpenAI 会话: {}", openAISessionId);
        }

        // 清理消息订阅
        Disposable subscription = messageSubscriptions.remove(sessionId);
        if (subscription != null && !subscription.isDisposed()) {
            subscription.dispose();
            log.info("已释放消息订阅: {}", sessionId);
        }

        // 清理会话映射
        sessions.remove(sessionId);
        log.info("WebSocket 连接关闭: sessionId={}, status={}", sessionId, status);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.error("WebSocket 传输错误: sessionId={}", session.getId(), exception);
        sessions.remove(session.getId());
    }

    private void handleListen(WebSocketSession session, JsonNode node) throws Exception {
        // 从 session attributes 中获取用户信息（由握手拦截器设置）
        Long userId = (Long) session.getAttributes().get("userId");
        if (userId == null) {
            log.error("无法获取用户 ID: sessionId={}", session.getId());
            sendError(session, "auth_error", "用户身份验证失败");
            return;
        }

        Long momentId = node.has("momentId") ? node.get("momentId").asLong() : null;
        String themeId = node.has("themeId") ? node.get("themeId").asText() : null;

        log.info("开始监听: sessionId={}, userId={}, momentId={}", session.getId(), userId, momentId);

        // 创建 OpenAI Realtime 会话
        String openAISessionId = "oai_" + session.getId();
        String systemPrompt = buildSystemPrompt(userId, momentId, themeId);

        openAIRealtimeService.createSession(openAISessionId, systemPrompt)
            .doOnSuccess(openAISession -> {
                sessionToOpenAI.put(session.getId(), openAISessionId);

                // 订阅 OpenAI 返回的消息
                Disposable subscription = openAISession.getInboundMessages()
                    .subscribe(
                        message -> handleOpenAIMessage(session, message),
                        error -> log.error("OpenAI 消息流错误: {}", error.getMessage()),
                        () -> log.info("OpenAI 消息流关闭")
                    );

                messageSubscriptions.put(session.getId(), subscription);

                try {
                    sendMessage(session, Map.of(
                        "type", "listen_started",
                        "userId", userId,
                        "momentId", momentId != null ? momentId : 0,
                        "timestamp", System.currentTimeMillis()
                    ));
                } catch (Exception e) {
                    log.error("发送 listen_started 失败", e);
                }
            })
            .doOnError(error -> {
                log.error("创建 OpenAI 会话失败: {}", error.getMessage());
                try {
                    sendError(session, "openai_error", "无法连接到 AI 服务");
                } catch (Exception e) {
                    log.error("发送错误消息失败", e);
                }
            })
            .subscribe();
    }

    private void handleAbort(WebSocketSession session, JsonNode node) throws Exception {
        log.info("中止会话: sessionId={}", session.getId());

        String openAISessionId = sessionToOpenAI.get(session.getId());
        if (openAISessionId != null) {
            openAIRealtimeService.closeSession(openAISessionId);
            sessionToOpenAI.remove(session.getId());
        }

        Disposable subscription = messageSubscriptions.remove(session.getId());
        if (subscription != null && !subscription.isDisposed()) {
            subscription.dispose();
        }

        sendMessage(session, Map.of(
            "type", "aborted",
            "timestamp", System.currentTimeMillis()
        ));
    }

    private void handleAudio(WebSocketSession session, JsonNode node) throws Exception {
        String audioData = node.get("data").asText();
        log.debug("收到音频数据: sessionId={}, size={}", session.getId(), audioData.length());

        String openAISessionId = sessionToOpenAI.get(session.getId());
        if (openAISessionId == null) {
            log.warn("未找到对应的 OpenAI 会话: sessionId={}", session.getId());
            sendError(session, "no_session", "请先调用 listen 开始会话");
            return;
        }

        // 解码 Base64 音频数据并发送到 OpenAI
        try {
            byte[] audioBytes = Base64.getDecoder().decode(audioData);
            openAIRealtimeService.sendAudio(openAISessionId, audioBytes);
        } catch (IllegalArgumentException e) {
            log.error("音频数据解码失败: {}", e.getMessage());
            sendError(session, "invalid_audio", "音频数据格式错误");
        }
    }

    private void handlePing(WebSocketSession session) throws Exception {
        lastHeartbeatTime.put(session.getId(), System.currentTimeMillis());
        sendMessage(session, Map.of(
            "type", "pong",
            "timestamp", System.currentTimeMillis()
        ));
        log.debug("响应心跳: sessionId={}", session.getId());
    }

    @Scheduled(fixedRate = 30000) // 每30秒检查一次
    public void checkHeartbeatTimeout() {
        long currentTime = System.currentTimeMillis();
        List<String> timeoutSessions = new ArrayList<>();

        lastHeartbeatTime.forEach((sessionId, lastTime) -> {
            if (currentTime - lastTime > HEARTBEAT_TIMEOUT_MS) {
                timeoutSessions.add(sessionId);
            }
        });

        timeoutSessions.forEach(sessionId -> {
            WebSocketSession session = sessions.get(sessionId);
            if (session != null && session.isOpen()) {
                try {
                    log.warn("会话心跳超时，关闭连接: sessionId={}", sessionId);
                    session.close(CloseStatus.SESSION_NOT_RELIABLE);
                } catch (Exception e) {
                    log.error("关闭超时会话失败: sessionId={}", sessionId, e);
                }
            }
            // 清理资源
            cleanupSession(sessionId);
        });

        if (!timeoutSessions.isEmpty()) {
            log.info("清理了 {} 个超时会话", timeoutSessions.size());
        }
    }

    /**
     * 处理从 OpenAI 接收的消息并转发给客户端
     */
    private void handleOpenAIMessage(WebSocketSession session, String message) {
        try {
            JsonNode json = objectMapper.readTree(message);
            String type = json.get("type").asText();

            switch (type) {
                case "response.audio.delta":
                    // 音频响应片段
                    String audioDelta = json.get("delta").asText();
                    sendMessage(session, Map.of(
                        "type", "audio_response",
                        "data", audioDelta,
                        "timestamp", System.currentTimeMillis()
                    ));
                    break;

                case "response.audio_transcript.delta":
                    // 音频转文本片段
                    String textDelta = json.get("delta").asText();
                    sendMessage(session, Map.of(
                        "type", "transcript_delta",
                        "text", textDelta,
                        "timestamp", System.currentTimeMillis()
                    ));
                    break;

                case "response.audio_transcript.done":
                    // 完整转录文本
                    String transcript = json.get("transcript").asText();
                    sendMessage(session, Map.of(
                        "type", "transcript_complete",
                        "text", transcript,
                        "timestamp", System.currentTimeMillis()
                    ));
                    break;

                case "response.done":
                    // 响应完成
                    sendMessage(session, Map.of(
                        "type", "response_complete",
                        "timestamp", System.currentTimeMillis()
                    ));
                    break;

                case "input_audio_buffer.speech_started":
                    // 检测到用户开始说话
                    sendMessage(session, Map.of(
                        "type", "speech_started",
                        "timestamp", System.currentTimeMillis()
                    ));
                    break;

                case "input_audio_buffer.speech_stopped":
                    // 检测到用户停止说话
                    sendMessage(session, Map.of(
                        "type", "speech_stopped",
                        "timestamp", System.currentTimeMillis()
                    ));
                    break;

                case "conversation.item.input_audio_transcription.completed":
                    // 用户音频转录完成
                    String userTranscript = json.get("transcript").asText();
                    sendMessage(session, Map.of(
                        "type", "user_transcript",
                        "text", userTranscript,
                        "timestamp", System.currentTimeMillis()
                    ));
                    break;

                case "error":
                    // OpenAI 错误
                    String errorMessage = json.has("error")
                        ? json.get("error").get("message").asText()
                        : "未知错误";
                    sendError(session, "openai_error", errorMessage);
                    break;

                default:
                    log.debug("未处理的 OpenAI 消息类型: {}", type);
            }
        } catch (Exception e) {
            log.error("处理 OpenAI 消息失败: {}", e.getMessage(), e);
        }
    }

    /**
     * 构建系统提示词
     */
    private String buildSystemPrompt(Long userId, Long momentId, String themeId) {
        // TODO: 从数据库加载用户画像、历史上下文、主题配置
        StringBuilder prompt = new StringBuilder();
        prompt.append("你是一个温暖、善于倾听和鼓励的 AI 助手。");
        prompt.append("你的任务是倾听用户的分享，给予真诚的夸奖和鼓励。");
        prompt.append("请用温暖、自然的语气回应，避免生硬或模板化的表达。");
        prompt.append("关注用户分享中的细节和情感，给予具体而真诚的反馈。");

        return prompt.toString();
    }

    private void sendMessage(WebSocketSession session, Map<String, Object> data) throws Exception {
        if (session.isOpen()) {
            String json = objectMapper.writeValueAsString(data);
            session.sendMessage(new TextMessage(json));
        }
    }

    private void sendError(WebSocketSession session, String code, String message) {
        try {
            sendMessage(session, Map.of(
                "type", "error",
                "code", code,
                "message", message,
                "timestamp", System.currentTimeMillis()
            ));
        } catch (Exception e) {
            log.error("发送错误消息失败", e);
        }
    }

    /**
     * 清理会话资源
     */
    private void cleanupSession(String sessionId) {
        // 清理 OpenAI 会话
        String openAISessionId = sessionToOpenAI.remove(sessionId);
        if (openAISessionId != null) {
            openAIRealtimeService.closeSession(openAISessionId);
        }

        // 清理消息订阅
        Disposable subscription = messageSubscriptions.remove(sessionId);
        if (subscription != null && !subscription.isDisposed()) {
            subscription.dispose();
        }

        // 清理会话映射和心跳
        sessions.remove(sessionId);
        lastHeartbeatTime.remove(sessionId);
    }
}
