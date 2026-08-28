package com.kuakua.mirror.device.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * 设备日志上传请求
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceLogRequest {

    private Long timestamp;

    private String level;          // DEBUG, INFO, WARN, ERROR

    private String message;

    private Map<String, Object> metadata;
}
