package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.device.domain.DeviceDiagnosticLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeviceDiagnosticLogRepository extends JpaRepository<DeviceDiagnosticLog, Long> {

    List<DeviceDiagnosticLog> findByDeviceIdAndTimestampBetweenOrderByTimestampDesc(String deviceId, Long start, Long end);

    void deleteByCreatedAtBefore(java.time.LocalDateTime before);
}
