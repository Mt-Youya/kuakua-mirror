package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.device.domain.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 设备Repository
 */
@Repository
public interface DeviceRepository extends JpaRepository<Device, String> {

    Optional<Device> findByActivationCode(String activationCode);

    Optional<Device> findByDeviceToken(String deviceToken);
}
