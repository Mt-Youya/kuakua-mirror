package com.kuakua.mirror.monitor.service;

import com.kuakua.mirror.monitor.dto.MonitorEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

/**
 * 监控事件服务
 * 负责向所有监控客户端广播事件
 */
@Slf4j
@Service
public class MonitorEventService {

    /**
     * 事件广播通道
     * multicast: 多个订阅者共享同一个流
     * onBackpressureBuffer: 背压策略，缓存未消费的事件
     */
    private final Sinks.Many<MonitorEvent> eventSink = Sinks.many().multicast().onBackpressureBuffer();

    /**
     * 广播事件到所有监控客户端
     */
    public void broadcast(MonitorEvent event) {
        log.debug("广播监控事件: type={}, data={}", event.getEventType(), event.getData());
        Sinks.EmitResult result = eventSink.tryEmitNext(event);

        if (result.isFailure()) {
            log.warn("事件广播失败: type={}, result={}", event.getEventType(), result);
        }
    }

    /**
     * 广播设备连接事件
     */
    public void broadcastDeviceConnected(String deviceId) {
        log.info("设备连接事件: deviceId={}", deviceId);
        broadcast(MonitorEvent.deviceConnected(deviceId));
    }

    /**
     * 广播设备断开事件
     */
    public void broadcastDeviceDisconnected(String deviceId) {
        log.info("设备断开事件: deviceId={}", deviceId);
        broadcast(MonitorEvent.deviceDisconnected(deviceId));
    }

    /**
     * 广播用户消息事件
     */
    public void broadcastUserMessage(String deviceId, String text) {
        log.info("用户消息事件: deviceId={}, text={}", deviceId, text);
        broadcast(MonitorEvent.userMessage(deviceId, text));
    }

    /**
     * 广播AI回复事件
     */
    public void broadcastAssistantMessage(String deviceId, String text) {
        log.info("AI回复事件: deviceId={}, text={}", deviceId, text);
        broadcast(MonitorEvent.assistantMessage(deviceId, text));
    }

    /**
     * 获取事件流
     * 用于SSE订阅
     */
    public Flux<MonitorEvent> getEventStream() {
        return eventSink.asFlux();
    }
}
