package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.device.domain.DeviceHeartbeat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface DeviceHeartbeatRepository extends JpaRepository<DeviceHeartbeat, Long> {

    List<DeviceHeartbeat> findByDeviceIdAndRecordedAtBetweenOrderByRecordedAtDesc(String deviceId, LocalDateTime start, LocalDateTime end);

    void deleteByRecordedAtBefore(LocalDateTime before);
}
