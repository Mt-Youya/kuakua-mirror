package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.device.domain.FirmwareRelease;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FirmwareReleaseRepository extends JpaRepository<FirmwareRelease, String> {

    List<FirmwareRelease> findByModelAndChannelOrderByPublishedAtDesc(String model, String channel);
}
