package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.device.domain.DeviceImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.time.LocalDateTime;

public interface DeviceImageRepository extends JpaRepository<DeviceImage, Long> {

    List<DeviceImage> findByDeviceIdOrderByUploadedAtDesc(String deviceId);

    List<DeviceImage> findByUploadedAtBefore(LocalDateTime before);
}
