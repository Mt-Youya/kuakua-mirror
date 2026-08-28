package com.kuakua.mirror.device.infra;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;

@Slf4j
@Component
@RequiredArgsConstructor
public class FirmwarePublishRunner implements ApplicationRunner {

    private final FirmwareReleaseService firmwareReleaseService;

    @Value("${firmware.publish.file:}")
    private String file;

    @Value("${firmware.publish.model:}")
    private String model;

    @Value("${firmware.publish.version:}")
    private String version;

    @Value("${firmware.publish.notes:}")
    private String notes;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (file.isBlank()) {
            return;
        }
        var release = firmwareReleaseService.publish(model, version, Files.readAllBytes(Path.of(file)), notes);
        log.info("已发布 stable 固件: model={}, version={}", release.getModel(), release.getVersion());
    }
}
