package com.kuakua.mirror.device.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 设备心跳请求
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceHeartbeatRequest {

    private Long uptime;           // 运行时间（秒）

    private Double memoryUsage;    // 内存使用率 0-1

    private Double cpuUsage;       // CPU使用率 0-1

    private Double temperature;    // 温度（摄氏度）
}
