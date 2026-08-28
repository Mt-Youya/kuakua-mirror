package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.device.domain.Device;
import com.kuakua.mirror.device.domain.DeviceStatus;
import com.kuakua.mirror.device.domain.FactoryActivationCode;
import com.kuakua.mirror.shared.exception.BusinessException;
import com.kuakua.mirror.shared.util.IdGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.Reader;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class FactoryProvisioningService {

    private final DeviceRepository deviceRepository;
    private final FactoryActivationCodeRepository activationCodeRepository;

    @Transactional
    public Device provision(String model, String serialNumber, String firmwareVersion, String activationCode, String kind) {
        if (blank(model) || blank(serialNumber) || blank(firmwareVersion) || blank(activationCode)) {
            throw new BusinessException("INVALID_FACTORY_RECORD", "出厂记录字段不完整");
        }
        Device device;
        if ("RECOVERY".equals(kind)) {
            device = deviceRepository.findBySerialNumber(serialNumber)
                    .orElseThrow(() -> new BusinessException("DEVICE_NOT_FOUND", "恢复码对应设备不存在"));
        } else {
            if (deviceRepository.findBySerialNumber(serialNumber).isPresent()) {
                throw new BusinessException("SERIAL_NUMBER_EXISTS", "设备序列号已登记");
            }
            device = deviceRepository.save(Device.builder()
                    .deviceId("device_" + IdGenerator.generateId())
                    .model(model)
                    .serialNumber(serialNumber)
                    .firmwareVersion(firmwareVersion)
                    .status(DeviceStatus.OFFLINE)
                    .build());
        }
        String codeHash = hash(activationCode);
        if (activationCodeRepository.findByCodeHash(codeHash).isPresent()) {
            throw new BusinessException("ACTIVATION_CODE_EXISTS", "激活码已登记");
        }
        activationCodeRepository.save(FactoryActivationCode.builder()
                .deviceId(device.getDeviceId())
                .codeHash(codeHash)
                .kind(kind == null || kind.isBlank() ? "FACTORY" : kind)
                .createdAt(LocalDateTime.now())
                .build());
        return device;
    }

    @Transactional
    public int importCsv(Reader reader) throws IOException {
        List<String[]> rows = new ArrayList<>();
        Set<String> serials = new HashSet<>();
        Set<String> codeHashes = new HashSet<>();
        try (BufferedReader lines = new BufferedReader(reader)) {
            String line;
            int row = 0;
            while ((line = lines.readLine()) != null) {
                row++;
                if (line.isBlank() || row == 1 && line.startsWith("model,")) {
                    continue;
                }
                String[] values = line.split(",", -1);
                if (values.length != 5) {
                    throw new BusinessException("INVALID_FACTORY_RECORD", "CSV 第 " + row + " 行格式无效");
                }
                String kind = values[4].isBlank() ? "FACTORY" : values[4].trim().toUpperCase();
                if (!Set.of("FACTORY", "RECOVERY").contains(kind) || !serials.add(values[1]) || !codeHashes.add(hash(values[3]))) {
                    throw new BusinessException("INVALID_FACTORY_RECORD", "CSV 存在重复或无效记录");
                }
                rows.add(new String[]{values[0], values[1], values[2], values[3], kind});
            }
        }
        rows.forEach(row -> provision(row[0], row[1], row[2], row[3], row[4]));
        return rows.size();
    }

    static String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (Exception exception) {
            throw new IllegalStateException("无法计算激活码哈希", exception);
        }
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
