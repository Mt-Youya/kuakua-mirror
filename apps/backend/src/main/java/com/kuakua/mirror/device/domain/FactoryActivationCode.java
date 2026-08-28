package com.kuakua.mirror.device.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "factory_activation_codes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FactoryActivationCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String deviceId;

    private String codeHash;

    private String kind;

    private LocalDateTime consumedAt;

    private LocalDateTime createdAt;
}
