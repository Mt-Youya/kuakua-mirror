package com.kuakua.mirror.device.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 设备配置更新请求
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceConfigUpdateRequest {

    private Integer volume;

    private Integer brightness;

    private String wakeWord;

    private String language;

    private String timezone;

    private Boolean autoUpdate;
}
