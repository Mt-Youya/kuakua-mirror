package com.kuakua.mirror.device.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * OTA状态上报请求
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OTAStatusRequest {

    private String status;         // downloading, verifying, installing, success, failed

    private String version;

    private Integer progress;      // 0-100

    private String error;          // 错误信息（如果失败）
}
