package com.kuakua.mirror.device.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "firmware_releases")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FirmwareRelease {

    @Id
    private String releaseId;

    private String model;

    private String version;

    private String storageBucket;

    private String storagePath;

    private Long fileSize;

    private String checksum;

    private String manifest;

    private String signature;

    private String releaseNotes;

    private String channel;

    private LocalDateTime publishedAt;
}
