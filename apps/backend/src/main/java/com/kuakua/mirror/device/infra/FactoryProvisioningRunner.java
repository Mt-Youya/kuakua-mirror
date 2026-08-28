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
public class FactoryProvisioningRunner implements ApplicationRunner {

    private final FactoryProvisioningService provisioningService;

    @Value("${factory.provisioning-csv:}")
    private String csvPath;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (csvPath.isBlank()) {
            return;
        }
        try (var reader = Files.newBufferedReader(Path.of(csvPath))) {
            log.info("已导入 {} 条出厂设备记录", provisioningService.importCsv(reader));
        }
    }
}
