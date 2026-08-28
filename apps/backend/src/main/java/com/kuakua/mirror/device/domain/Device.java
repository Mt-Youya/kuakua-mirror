package com.kuakua.mirror.device.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 设备实体
 */
@Entity
@Table(name = "devices")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Device {

    @Id
    private String deviceId;

    private String activationCode;

    private String model;

    private String serialNumber;

    private String firmwareVersion;

    private String macAddress;

    private String deviceToken;

    @Enumerated(EnumType.STRING)
    private DeviceStatus status;

    private LocalDateTime lastHeartbeat;

    private LocalDateTime activatedAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
