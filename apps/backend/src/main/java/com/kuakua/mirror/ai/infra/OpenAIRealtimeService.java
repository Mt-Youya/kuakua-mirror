package com.kuakua.mirror.ai.infra;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import org.springframework.web.reactive.socket.client.ReactorNettyWebSocketClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.net.URI;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class OpenAIRealtimeService {

    @Value("${openai.api-key:}")
    private String apiKey;

    @Value("${openai.realtime-url:wss://api.openai.com/v1/realtime}")
    private String realtimeUrl;

    @Value("${openai.model.llm:gpt-4o-realtime-preview}")
    private String model;

    private final ObjectMapper objectMapper;
    private final ReactorNettyWebSocketClient webSocketClient;
    private final Map<String, OpenAISession> activeSessions;

    public OpenAIRealtimeService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.webSocketClient = new ReactorNettyWebSocketClient();
        this.activeSessions = new ConcurrentHashMap<>();
    }

    /**
     * 创建新的 OpenAI Realtime WebSocket 连接
     */
    public Mono<OpenAISession> createSession(String sessionId, String systemPrompt) {
        String wsUrl = realtimeUrl + "?model=" + model;

        OpenAISession session = new OpenAISession(sessionId);
        activeSessions.put(sessionId, session);

        return webSocketClient
            .execute(
                URI.create(wsUrl),
                wsSession -> {
                    session.setWebSocketSession(wsSession);

                    // 发送会话配置
                    Mono<Void> sendConfig = sendSessionUpdate(wsSession, systemPrompt);

                    // 接收消息
                    Mono<Void> receive = wsSession.receive()
                        .map(WebSocketMessage::getPayloadAsText)
                        .doOnNext(message -> handleOpenAIMessage(sessionId, message))
                        .doOnError(error -> log.error("OpenAI WebSocket error for session {}: {}", sessionId, error.getMessage()))
                        .then();

                    // 发送消息
                    Mono<Void> send = session.getOutboundSink()
                        .asFlux()
                        .map(wsSession::textMessage)
                        .as(wsSession::send);

                    return sendConfig.then(Mono.when(receive, send));
                }
            )
            .doOnError(error -> {
                log.error("Failed to connect to OpenAI Realtime API: {}", error.getMessage());
                activeSessions.remove(sessionId);
            })
            .then(Mono.just(session));
    }

    /**
     * 发送会话配置
     */
    private Mono<Void> sendSessionUpdate(WebSocketSession wsSession, String systemPrompt) {
        try {
            Map<String, Object> config = new HashMap<>();
            config.put("type", "session.update");

            Map<String, Object> session = new HashMap<>();
            session.put("modalities", new String[]{"text", "audio"});
            session.put("instructions", systemPrompt);
            session.put("voice", "alloy");
            session.put("input_audio_format", "pcm16");
            session.put("output_audio_format", "pcm16");
            session.put("input_audio_transcription", Map.of("model", "whisper-1"));
            session.put("turn_detection", Map.of(
                "type", "server_vad",
                "threshold", 0.5,
                "prefix_padding_ms", 300,
                "silence_duration_ms", 500
            ));

            config.put("session", session);

            String json = objectMapper.writeValueAsString(config);
            return wsSession.send(Mono.just(wsSession.textMessage(json))).then();
        } catch (Exception e) {
            log.error("Failed to send session config: {}", e.getMessage());
            return Mono.error(e);
        }
    }

    /**
     * 发送音频数据到 OpenAI
     */
    public void sendAudio(String sessionId, byte[] audioData) {
        OpenAISession session = activeSessions.get(sessionId);
        if (session == null) {
            log.warn("Session {} not found", sessionId);
            return;
        }

        try {
            String base64Audio = Base64.getEncoder().encodeToString(audioData);
            Map<String, Object> message = new HashMap<>();
            message.put("type", "input_audio_buffer.append");
            message.put("audio", base64Audio);

            String json = objectMapper.writeValueAsString(message);
            session.send(json);
        } catch (Exception e) {
            log.error("Failed to send audio for session {}: {}", sessionId, e.getMessage());
        }
    }

    /**
     * 提交音频输入（触发 AI 处理）
     */
    public void commitAudio(String sessionId) {
        OpenAISession session = activeSessions.get(sessionId);
        if (session == null) {
            log.warn("Session {} not found", sessionId);
            return;
        }

        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", "input_audio_buffer.commit");

            String json = objectMapper.writeValueAsString(message);
            session.send(json);
        } catch (Exception e) {
            log.error("Failed to commit audio for session {}: {}", sessionId, e.getMessage());
        }
    }

    /**
     * 发送文本消息到 OpenAI
     */
    public void sendText(String sessionId, String text) {
        OpenAISession session = activeSessions.get(sessionId);
        if (session == null) {
            log.warn("Session {} not found", sessionId);
            return;
        }

        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", "conversation.item.create");
            message.put("item", Map.of(
                "type", "message",
                "role", "user",
                "content", new Object[]{
                    Map.of("type", "input_text", "text", text)
                }
            ));

            String json = objectMapper.writeValueAsString(message);
            session.send(json);

            // 触发响应生成
            Map<String, Object> responseCreate = new HashMap<>();
            responseCreate.put("type", "response.create");
            String responseJson = objectMapper.writeValueAsString(responseCreate);
            session.send(responseJson);
        } catch (Exception e) {
            log.error("Failed to send text for session {}: {}", sessionId, e.getMessage());
        }
    }

    /**
     * 处理从 OpenAI 接收的消息
     */
    private void handleOpenAIMessage(String sessionId, String message) {
        try {
            JsonNode json = objectMapper.readTree(message);
            String type = json.get("type").asText();

            log.debug("Received from OpenAI [{}]: {}", sessionId, type);

            OpenAISession session = activeSessions.get(sessionId);
            if (session != null) {
                session.addInboundMessage(message);
            }
        } catch (Exception e) {
            log.error("Failed to parse OpenAI message for session {}: {}", sessionId, e.getMessage());
        }
    }

    /**
     * 获取会话
     */
    public OpenAISession getSession(String sessionId) {
        return activeSessions.get(sessionId);
    }

    /**
     * 关闭会话
     */
    public void closeSession(String sessionId) {
        OpenAISession session = activeSessions.remove(sessionId);
        if (session != null) {
            session.close();
            log.info("Closed OpenAI session: {}", sessionId);
        }
    }

    /**
     * OpenAI 会话封装类
     */
    public static class OpenAISession {
        private final String sessionId;
        private WebSocketSession webSocketSession;
        private final Sinks.Many<String> outboundSink;
        private final Sinks.Many<String> inboundSink;

        public OpenAISession(String sessionId) {
            this.sessionId = sessionId;
            this.outboundSink = Sinks.many().multicast().onBackpressureBuffer();
            this.inboundSink = Sinks.many().multicast().onBackpressureBuffer();
        }

        public void setWebSocketSession(WebSocketSession webSocketSession) {
            this.webSocketSession = webSocketSession;
        }

        public void send(String message) {
            outboundSink.tryEmitNext(message);
        }

        public void addInboundMessage(String message) {
            inboundSink.tryEmitNext(message);
        }

        public Flux<String> getInboundMessages() {
            return inboundSink.asFlux();
        }

        public Sinks.Many<String> getOutboundSink() {
            return outboundSink;
        }

        public void close() {
            if (webSocketSession != null) {
                webSocketSession.close().subscribe();
            }
            outboundSink.tryEmitComplete();
            inboundSink.tryEmitComplete();
        }

        public String getSessionId() {
            return sessionId;
        }
    }
}
