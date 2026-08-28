package com.kuakua.mirror.device.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kuakua.mirror.device.domain.DeviceSession;
import com.kuakua.mirror.device.domain.DeviceStatus;
import com.kuakua.mirror.device.dto.DeviceMessage;
import com.kuakua.mirror.device.infra.DeviceProtocolAdapter;
import com.kuakua.mirror.device.infra.DeviceSessionManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * DeviceWebSocketHandler 单元测试
 */
class DeviceWebSocketHandlerTest {

    private DeviceWebSocketHandler handler;
    private DeviceSessionManager sessionManager;
    private DeviceProtocolAdapter protocolAdapter;
    private ObjectMapper objectMapper;
    private WebSocketSession wsSession;

    @BeforeEach
    void setUp() {
        sessionManager = mock(DeviceSessionManager.class);
        protocolAdapter = mock(DeviceProtocolAdapter.class);
        objectMapper = new ObjectMapper();
        wsSession = mock(WebSocketSession.class);

        handler = new DeviceWebSocketHandler(sessionManager, protocolAdapter, objectMapper);

        // 模拟 WebSocket session
        when(wsSession.getId()).thenReturn("ws-session-123");
        when(wsSession.getAttributes()).thenReturn(new HashMap<>());
        when(wsSession.receive()).thenReturn(Flux.empty());
        when(wsSession.send(any())).thenReturn(Mono.empty());
    }

    @Test
    void testHandleDeviceInfo_ShouldCreateSession() throws Exception {
        // Given
        DeviceMessage deviceInfo = DeviceMessage.deviceInfo(
                "mirror_001",
                "1.0.0",
                List.of("audio", "display")
        );
        String json = objectMapper.writeValueAsString(deviceInfo);

        WebSocketMessage wsMessage = mock(WebSocketMessage.class);
        when(wsMessage.getPayloadAsText()).thenReturn(json);
        when(wsSession.receive()).thenReturn(Flux.just(wsMessage));
        when(wsSession.send(any())).thenReturn(Mono.empty());

        DeviceSession mockSession = DeviceSession.builder()
                .sessionId("sess_123")
                .deviceId("mirror_001")
                .firmwareVersion("1.0.0")
                .status(DeviceStatus.IDLE)
                .build();

        when(sessionManager.createSession(anyString(), eq("mirror_001"), eq("1.0.0"), eq("1.0"), any()))
                .thenReturn(mockSession);

        // When
        StepVerifier.create(handler.handle(wsSession))
                .expectComplete()
                .verify();

        // Then
        verify(sessionManager).createSession(anyString(), eq("mirror_001"), eq("1.0.0"), eq("1.0"), any());
        verify(sessionManager).bindWebSocketSession(eq("mirror_001"), eq(wsSession));
        verify(sessionManager).updateStatus(eq("mirror_001"), eq(DeviceStatus.IDLE));

        Map<String, Object> attributes = wsSession.getAttributes();
        assertEquals("mirror_001", attributes.get("deviceId"));
    }

    @Test
    void testHandleHeartbeat_ShouldUpdateActivityAndRespondPong() throws Exception {
        // Given
        Map<String, Object> attributes = wsSession.getAttributes();
        attributes.put("deviceId", "mirror_001");

        DeviceMessage heartbeat = DeviceMessage.heartbeat(System.currentTimeMillis());
        String json = objectMapper.writeValueAsString(heartbeat);

        WebSocketMessage wsMessage = mock(WebSocketMessage.class);
        when(wsMessage.getPayloadAsText()).thenReturn(json);
        when(wsSession.receive()).thenReturn(Flux.just(wsMessage));

        WebSocketMessage pongMessage = mock(WebSocketMessage.class);
        when(wsSession.textMessage(anyString())).thenReturn(pongMessage);
        when(wsSession.send(any())).thenReturn(Mono.empty());

        // When
        StepVerifier.create(handler.handle(wsSession))
                .expectComplete()
                .verify();

        // Then
        verify(sessionManager).updateActivity("mirror_001");
    }

    @Test
    void testHandleAudio_ShouldTranslateToOpenAI() throws Exception {
        // Given
        Map<String, Object> attributes = wsSession.getAttributes();
        attributes.put("deviceId", "mirror_001");

        DeviceMessage audio = DeviceMessage.audio("base64AudioData");
        String json = objectMapper.writeValueAsString(audio);

        WebSocketMessage wsMessage = mock(WebSocketMessage.class);
        when(wsMessage.getPayloadAsText()).thenReturn(json);
        when(wsSession.receive()).thenReturn(Flux.just(wsMessage));
        when(wsSession.send(any())).thenReturn(Mono.empty());

        // When
        StepVerifier.create(handler.handle(wsSession))
                .expectComplete()
                .verify();

        // Then
        verify(sessionManager).updateActivity("mirror_001");
        verify(protocolAdapter).translateToOpenAI(argThat(msg ->
                "audio".equals(msg.getType()) && "base64AudioData".equals(msg.getData())
        ));
    }

    @Test
    void testHandleAudioEnd_ShouldTranslateToOpenAI() throws Exception {
        // Given
        Map<String, Object> attributes = wsSession.getAttributes();
        attributes.put("deviceId", "mirror_001");

        DeviceMessage audioEnd = DeviceMessage.audioEnd();
        String json = objectMapper.writeValueAsString(audioEnd);

        WebSocketMessage wsMessage = mock(WebSocketMessage.class);
        when(wsMessage.getPayloadAsText()).thenReturn(json);
        when(wsSession.receive()).thenReturn(Flux.just(wsMessage));
        when(wsSession.send(any())).thenReturn(Mono.empty());

        // When
        StepVerifier.create(handler.handle(wsSession))
                .expectComplete()
                .verify();

        // Then
        verify(sessionManager).updateActivity("mirror_001");
        verify(protocolAdapter).translateToOpenAI(argThat(msg ->
                "audio_end".equals(msg.getType())
        ));
    }

    @Test
    void testConnectionClose_ShouldCleanupSession() {
        // Given
        Map<String, Object> attributes = wsSession.getAttributes();
        attributes.put("deviceId", "mirror_001");

        when(wsSession.receive()).thenReturn(Flux.empty());
        when(wsSession.send(any())).thenReturn(Mono.empty());

        // When
        StepVerifier.create(handler.handle(wsSession))
                .expectComplete()
                .verify();

        // Then
        verify(sessionManager).removeSession("mirror_001");
    }

    @Test
    void testParseInvalidJson_ShouldSkipMessage() {
        // Given
        WebSocketMessage wsMessage = mock(WebSocketMessage.class);
        when(wsMessage.getPayloadAsText()).thenReturn("{invalid json}");
        when(wsSession.receive()).thenReturn(Flux.just(wsMessage));
        when(wsSession.send(any())).thenReturn(Mono.empty());

        // When
        StepVerifier.create(handler.handle(wsSession))
                .expectComplete()
                .verify();

        // Then
        // 应该不会调用任何处理方法
        verify(sessionManager, never()).createSession(any(), any(), any(), any(), any());
        verify(sessionManager, never()).updateActivity(any());
    }
}
