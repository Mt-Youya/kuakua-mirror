package com.kuakua.mirror.monitor.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kuakua.mirror.monitor.dto.MonitorEvent;
import com.kuakua.mirror.monitor.service.MonitorEventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.time.Duration;

/**
 * 监控控制器
 * 提供SSE接口用于实时监控设备状态和对话消息
 */
@Slf4j
@RestController
@RequestMapping("/api/monitor")
@RequiredArgsConstructor
public class MonitorController {

    private final MonitorEventService eventService;
    private final ObjectMapper objectMapper;

    /**
     * SSE流接口
     * GET /api/monitor/stream
     *
     * 返回Server-Sent Events流，实时推送：
     * - device_connected: 设备连接事件
     * - device_disconnected: 设备断开事件
     * - user_message: 用户消息事件
     * - assistant_message: AI回复事件
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> stream() {
        log.info("监控客户端连接。。。");

        return eventService.getEventStream()
                .map(this::toServerSentEvent)
                .doOnCancel(() -> log.info("监控客户端断开"))
                .doOnError(error -> log.error("SSE流错误", error))
                // 每30秒发送心跳，保持连接
                .mergeWith(heartbeat());
    }

    /**
     * 将MonitorEvent转换为ServerSentEvent
     */
    private ServerSentEvent<String> toServerSentEvent(MonitorEvent event) {
        try {
            String data = objectMapper.writeValueAsString(event.getData());
            return ServerSentEvent.<String>builder()
                    .event(event.getEventType())
                    .data(data)
                    .build();
        } catch (Exception e) {
            log.error("转换事件失败: type={}", event.getEventType(), e);
            return ServerSentEvent.<String>builder()
                    .event("error")
                    .data("{\"message\":\"事件序列化失败\"}")
                    .build();
        }
    }

    /**
     * 心跳事件
     * 每30秒发送一次，保持SSE连接活跃
     */
    private Flux<ServerSentEvent<String>> heartbeat() {
        return Flux.interval(Duration.ofSeconds(30))
                .map(seq -> ServerSentEvent.<String>builder()
                        .comment("heartbeat")
                        .build());
    }
}
