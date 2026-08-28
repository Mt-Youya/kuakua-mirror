package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.device.domain.Device;
import com.kuakua.mirror.device.domain.FirmwareRelease;
import com.kuakua.mirror.device.domain.OtaUpdate;
import com.kuakua.mirror.shared.exception.BusinessException;
import com.kuakua.mirror.shared.util.IdGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Comparator;

@Service
@RequiredArgsConstructor
public class FirmwareReleaseService {

    private final FirmwareReleaseRepository releaseRepository;
    private final OtaUpdateRepository otaUpdateRepository;
    private final DeviceRepository deviceRepository;
    private final SupabaseStorageService storageService;

    @Value("${supabase.firmware-bucket:device-firmware}")
    private String firmwareBucket;

    @Value("${firmware.signing-private-key:}")
    private String signingPrivateKey;

    @Transactional
    public FirmwareRelease publish(String model, String version, byte[] content, String notes) {
        if (!version.matches("\\d+\\.\\d+\\.\\d+")) {
            throw new BusinessException("INVALID_FIRMWARE_VERSION", "固件版本必须为 x.y.z");
        }
        if (releaseRepository.findByModelAndChannelOrderByPublishedAtDesc(model, "stable").stream()
                .anyMatch(release -> release.getVersion().equals(version))) {
            throw new BusinessException("FIRMWARE_RELEASE_EXISTS", "该型号和版本已发布");
        }
        String checksum = sha256(content);
        String path = model + "/" + version + "/firmware.bin";
        String manifest = manifest(model, version, checksum);
        String signature = sign(manifest);
        boolean uploaded = false;
        try {
            storageService.upload(firmwareBucket, path, "application/octet-stream", content);
            uploaded = true;
            return releaseRepository.saveAndFlush(FirmwareRelease.builder()
                    .releaseId("firmware_" + IdGenerator.generateId())
                    .model(model)
                    .version(version)
                    .storageBucket(firmwareBucket)
                    .storagePath(path)
                    .fileSize((long) content.length)
                    .checksum(checksum)
                    .manifest(manifest)
                    .signature(signature)
                    .releaseNotes(notes)
                    .channel("stable")
                    .publishedAt(LocalDateTime.now())
                    .build());
        } catch (Exception exception) {
            if (uploaded) {
                try {
                    storageService.delete(firmwareBucket, path);
                } catch (Exception ignored) {
                }
            }
            if (exception instanceof BusinessException businessException) {
                throw businessException;
            }
            throw exception;
        }
    }

    public FirmwareRelease newerStableRelease(Device device) {
        return releaseRepository.findByModelAndChannelOrderByPublishedAtDesc(device.getModel(), "stable").stream()
                .filter(release -> compareVersions(release.getVersion(), device.getFirmwareVersion()) > 0)
                .min(Comparator.comparing(FirmwareRelease::getVersion, this::compareVersions))
                .orElse(null);
    }

    public String signedDownloadUrl(FirmwareRelease release) {
        return storageService.signedDownloadUrl(release.getStorageBucket(), release.getStoragePath(), 600);
    }

    @Transactional
    public void reportStatus(Device device, String version, String status, Integer progress, String error) {
        if (version == null || !version.matches("\\d+\\.\\d+\\.\\d+") || !java.util.Set.of("downloading", "verifying", "installing", "success", "failed").contains(status)
                || progress == null || progress < 0 || progress > 100) {
            throw new BusinessException("INVALID_OTA_STATUS", "OTA 状态或进度无效");
        }
        if (releaseRepository.findByModelAndChannelOrderByPublishedAtDesc(device.getModel(), "stable").stream()
                .noneMatch(release -> release.getVersion().equals(version) && compareVersions(version, device.getFirmwareVersion()) > 0)) {
            throw new BusinessException("INVALID_OTA_STATUS", "OTA 版本未发布或不适配该设备");
        }
        OtaUpdate update = otaUpdateRepository.findFirstByDeviceIdOrderByUpdatedAtDesc(device.getDeviceId())
                .orElseGet(() -> OtaUpdate.builder()
                        .deviceId(device.getDeviceId())
                        .fromVersion(device.getFirmwareVersion())
                        .toVersion(version)
                        .startedAt(LocalDateTime.now())
                        .createdAt(LocalDateTime.now())
                        .build());
        if (!update.getToVersion().equals(version)) {
            throw new BusinessException("INVALID_OTA_STATUS", "OTA 版本不匹配");
        }
        update.setStatus(status);
        update.setProgress(progress);
        update.setError(error);
        update.setUpdatedAt(LocalDateTime.now());
        if ("success".equals(status) || "failed".equals(status)) {
            update.setCompletedAt(LocalDateTime.now());
        }
        otaUpdateRepository.save(update);
        if ("success".equals(status)) {
            device.setFirmwareVersion(version);
            deviceRepository.save(device);
        }
    }

    private String sha256(byte[] content) {
        try {
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (Exception exception) {
            throw new IllegalStateException("无法计算固件校验和", exception);
        }
    }

    private String sign(String manifest) {
        if (signingPrivateKey == null || signingPrivateKey.isBlank()) {
            throw new BusinessException("FIRMWARE_SIGNING_UNAVAILABLE", "固件签名配置缺失");
        }
        try {
            PrivateKey key = KeyFactory.getInstance("Ed25519").generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(signingPrivateKey)));
            Signature signature = Signature.getInstance("Ed25519");
            signature.initSign(key);
            signature.update(manifest.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(signature.sign());
        } catch (Exception exception) {
            throw new BusinessException("FIRMWARE_SIGNING_UNAVAILABLE", "固件签名配置无效");
        }
    }

    private String manifest(String model, String version, String checksum) {
        return "v1\nmodel=" + model + "\nversion=" + version + "\nsha256=" + checksum;
    }

    private int compareVersions(String left, String right) {
        String[] leftParts = left.split("\\.");
        String[] rightParts = right.split("\\.");
        for (int index = 0; index < 3; index++) {
            int comparison = Integer.compare(Integer.parseInt(leftParts[index]), Integer.parseInt(rightParts[index]));
            if (comparison != 0) {
                return comparison;
            }
        }
        return 0;
    }
}
