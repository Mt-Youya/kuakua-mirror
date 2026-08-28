package com.kuakua.mirror.device.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * OTA检查更新响应
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OTACheckResponse {

    private Boolean updateAvailable;

    private String version;

    private String downloadUrl;

    private Long fileSize;

    private String checksum;

    private String releaseNotes;
}
