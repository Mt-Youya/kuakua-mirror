package com.kuakua.mirror.device.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 设备配置实体
 */
@Entity
@Table(name = "device_configs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceConfig {

    @Id
    private String deviceId;

    private Integer volume;              // 音量 0-100

    private Integer brightness;          // 亮度 0-100

    private String wakeWord;             // 唤醒词

    private String language;             // 语言 zh-CN, en-US

    private String timezone;             // 时区

    private Boolean autoUpdate;          // 自动更新

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
