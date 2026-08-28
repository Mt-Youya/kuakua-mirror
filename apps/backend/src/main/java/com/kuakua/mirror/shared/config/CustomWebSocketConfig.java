package com.kuakua.mirror.shared.config;

import com.kuakua.mirror.audio.api.AudioWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class CustomWebSocketConfig implements WebSocketConfigurer {

    private final AudioWebSocketHandler audioWebSocketHandler;

    @Value("${websocket.allowed-origins}")
    private String allowedOrigins;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(audioWebSocketHandler, "/ws/audio")
                .setAllowedOrigins(allowedOrigins.split(","));
    }
}
