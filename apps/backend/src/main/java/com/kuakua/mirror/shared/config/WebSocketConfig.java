package com.kuakua.mirror.shared.config;

import com.kuakua.mirror.device.api.DeviceWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.HandlerMapping;
import org.springframework.web.reactive.handler.SimpleUrlHandlerMapping;
import org.springframework.web.reactive.socket.server.support.WebSocketHandlerAdapter;

import java.util.Map;

/**
 * WebSocket 配置
 */
@Configuration
@RequiredArgsConstructor
public class WebSocketConfig {

    private final DeviceWebSocketHandler deviceWebSocketHandler;

    /**
     * 配置 WebSocket 路由映射
     */
    @Bean
    public HandlerMapping deviceWebSocketHandlerMapping() {
        SimpleUrlHandlerMapping mapping = new SimpleUrlHandlerMapping();
        mapping.setUrlMap(Map.of(
                "/device/ws", deviceWebSocketHandler
        ));
        mapping.setOrder(1);
        return mapping;
    }

    /**
     * WebSocket 处理器适配器
     */
    @Bean
    public WebSocketHandlerAdapter handlerAdapter() {
        return new WebSocketHandlerAdapter();
    }
}
