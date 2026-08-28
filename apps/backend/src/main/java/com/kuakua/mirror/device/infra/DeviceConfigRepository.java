package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.device.domain.DeviceConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 设备配置Repository
 */
@Repository
public interface DeviceConfigRepository extends JpaRepository<DeviceConfig, String> {
}
