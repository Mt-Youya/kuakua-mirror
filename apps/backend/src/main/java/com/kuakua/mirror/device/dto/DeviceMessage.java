package com.kuakua.mirror.device.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 硬件设备消息
 *
 * 支持的消息类型：
 * - audio: 音频数据
 * - audio_end: 音频输入结束
 * - text: 文本输入（备用）
 * - heartbeat: 心跳
 * - device_info: 设备信息
 * - transcript: 转写文本（后端→硬件）
 * - response_text: AI回复文本（后端→硬件）
 * - audio_response: 音频响应（后端→硬件）
 * - audio_response_end: 音频响应结束（后端→硬件）
 * - error: 错误信息（后端→硬件）
 * - pong: 心跳响应（后端→硬件）
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DeviceMessage {

    /**
     * 消息类型
     */
    private String type;

    /**
     * Base64编码的音频数据（用于 audio、audio_response）
     */
    private String data;

    /**
     * 文本内容（用于 text、transcript、response_text）
     */
    private String content;

    /**
     * 时间戳（用于 heartbeat、pong）
     */
    private Long timestamp;

    /**
     * 设备ID（用于 device_info）
     */
    private String deviceId;

    /**
     * 固件版本（用于 device_info）
     */
    private String firmwareVersion;

    /**
     * 设备能力列表（用于 device_info）
     */
    private List<String> capabilities;

    /**
     * 是否为最后一块数据（用于 audio_response）
     */
    private Boolean isFinal;

    /**
     * 错误码（用于 error）
     */
    private String code;

    /**
     * 错误消息（用于 error）
     */
    private String message;

    /**
     * 文本内容（用于 transcript、response_text）
     * 与 content 字段相同，提供别名以兼容不同命名习惯
     */
    private String text;

    // 静态工厂方法

    public static DeviceMessage audio(String data) {
        return DeviceMessage.builder()
                .type("audio")
                .data(data)
                .build();
    }

    public static DeviceMessage audioEnd() {
        return DeviceMessage.builder()
                .type("audio_end")
                .build();
    }

    public static DeviceMessage text(String content) {
        return DeviceMessage.builder()
                .type("text")
                .content(content)
                .build();
    }

    public static DeviceMessage heartbeat(Long timestamp) {
        return DeviceMessage.builder()
                .type("heartbeat")
                .timestamp(timestamp)
                .build();
    }

    public static DeviceMessage deviceInfo(String deviceId, String firmwareVersion, List<String> capabilities) {
        return DeviceMessage.builder()
                .type("device_info")
                .deviceId(deviceId)
                .firmwareVersion(firmwareVersion)
                .capabilities(capabilities)
                .build();
    }

    public static DeviceMessage transcript(String text) {
        return DeviceMessage.builder()
                .type("transcript")
                .text(text)
                .build();
    }

    public static DeviceMessage responseText(String text) {
        return DeviceMessage.builder()
                .type("response_text")
                .text(text)
                .build();
    }

    public static DeviceMessage audioResponse(String data, boolean isFinal) {
        return DeviceMessage.builder()
                .type("audio_response")
                .data(data)
                .isFinal(isFinal)
                .build();
    }

    public static DeviceMessage audioResponseEnd() {
        return DeviceMessage.builder()
                .type("audio_response_end")
                .build();
    }

    public static DeviceMessage error(String code, String message) {
        return DeviceMessage.builder()
                .type("error")
                .code(code)
                .message(message)
                .build();
    }

    public static DeviceMessage pong(Long timestamp) {
        return DeviceMessage.builder()
                .type("pong")
                .timestamp(timestamp)
                .build();
    }
}
