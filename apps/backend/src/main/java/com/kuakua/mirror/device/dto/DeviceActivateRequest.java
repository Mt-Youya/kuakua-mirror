package com.kuakua.mirror.device.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 设备激活请求
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceActivateRequest {

    private String activationCode;

    private DeviceInfo deviceInfo;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeviceInfo {
        private String model;
        private String serialNumber;
        private String firmwareVersion;
        private String macAddress;
    }
}
