package com.kuakua.mirror.device.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "device_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceDiagnosticLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String deviceId;

    private Long timestamp;

    private String level;

    private String message;

    @JdbcTypeCode(SqlTypes.JSON)
    private String metadata;

    private LocalDateTime createdAt;
}
