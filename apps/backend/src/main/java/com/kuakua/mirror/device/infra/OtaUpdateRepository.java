package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.device.domain.OtaUpdate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OtaUpdateRepository extends JpaRepository<OtaUpdate, Long> {

    List<OtaUpdate> findByDeviceIdOrderByUpdatedAtDesc(String deviceId);

    Optional<OtaUpdate> findFirstByDeviceIdOrderByUpdatedAtDesc(String deviceId);

    void deleteByUpdatedAtBefore(java.time.LocalDateTime before);
}
