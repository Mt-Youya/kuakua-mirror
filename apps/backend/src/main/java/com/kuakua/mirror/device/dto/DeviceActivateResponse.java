package com.kuakua.mirror.device.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 设备激活响应
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceActivateResponse {

    private String deviceId;

    private String token;

    private String message;
}
