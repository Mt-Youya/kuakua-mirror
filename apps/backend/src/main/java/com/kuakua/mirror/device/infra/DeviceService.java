package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.device.domain.Device;
import com.kuakua.mirror.device.domain.DeviceConfig;
import com.kuakua.mirror.device.domain.DeviceStatus;
import com.kuakua.mirror.device.domain.FactoryActivationCode;
import com.kuakua.mirror.shared.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.security.SecureRandom;

/**
 * 设备服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final DeviceConfigRepository deviceConfigRepository;
    private final FactoryActivationCodeRepository activationCodeRepository;

    /**
     * 设备激活
     */
    @Transactional
    public Activation activateDevice(String activationCode, String model, String serialNumber,
                                  String firmwareVersion, String macAddress) {
        if (activationCode == null || activationCode.isBlank()) {
            throw new BusinessException("ACTIVATION_CODE_INVALID", "激活码无效或已使用");
        }
        FactoryActivationCode factoryCode = activationCodeRepository.findByCodeHash(FactoryProvisioningService.hash(activationCode))
                .filter(code -> code.getConsumedAt() == null)
                .orElseThrow(() -> new BusinessException("ACTIVATION_CODE_INVALID", "激活码无效或已使用"));
        Device device = deviceRepository.findById(factoryCode.getDeviceId())
                .orElseThrow(() -> new BusinessException("DEVICE_NOT_FOUND", "设备不存在"));
        if (!device.getSerialNumber().equals(serialNumber) || !device.getModel().equals(model)) {
            throw new BusinessException("ACTIVATION_CODE_INVALID", "激活码与设备不匹配");
        }

        String deviceToken = newToken();
        device.setDeviceTokenHash(FactoryProvisioningService.hash(deviceToken));
        device.setFirmwareVersion(firmwareVersion);
        device.setMacAddress(macAddress);
        device.setStatus(DeviceStatus.OFFLINE);
        device.setActivatedAt(LocalDateTime.now());
        deviceRepository.save(device);
        factoryCode.setConsumedAt(LocalDateTime.now());
        activationCodeRepository.save(factoryCode);

        // 创建默认配置
        if (!deviceConfigRepository.existsById(device.getDeviceId())) {
            deviceConfigRepository.save(DeviceConfig.builder()
                    .deviceId(device.getDeviceId())
                    .volume(50)
                    .brightness(80)
                    .wakeWord("你好镜子")
                    .language("zh-CN")
                    .timezone("Asia/Shanghai")
                    .autoUpdate(true)
                    .build());
        }

        log.info("设备激活成功: deviceId={}", device.getDeviceId());
        return new Activation(device, deviceToken);
    }

    /**
     * 获取设备配置
     */
    public DeviceConfig getDeviceConfig(String deviceId) {
        return deviceConfigRepository.findById(deviceId)
                .orElseThrow(() -> new BusinessException("DEVICE_NOT_FOUND", "设备不存在"));
    }

    /**
     * 更新设备配置
     */
    @Transactional
    public DeviceConfig updateDeviceConfig(String deviceId, DeviceConfig updates) {
        DeviceConfig config = getDeviceConfig(deviceId);

        if (updates.getVolume() != null) {
            config.setVolume(updates.getVolume());
        }
        if (updates.getBrightness() != null) {
            config.setBrightness(updates.getBrightness());
        }
        if (updates.getWakeWord() != null) {
            config.setWakeWord(updates.getWakeWord());
        }
        if (updates.getLanguage() != null) {
            config.setLanguage(updates.getLanguage());
        }
        if (updates.getTimezone() != null) {
            config.setTimezone(updates.getTimezone());
        }
        if (updates.getAutoUpdate() != null) {
            config.setAutoUpdate(updates.getAutoUpdate());
        }

        return deviceConfigRepository.save(config);
    }

    /**
     * 更新设备心跳
     */
    @Transactional
    public void updateHeartbeat(String deviceId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new BusinessException("DEVICE_NOT_FOUND", "设备不存在"));

        device.setLastHeartbeat(LocalDateTime.now());
        if (device.getStatus() == DeviceStatus.OFFLINE) {
            device.setStatus(DeviceStatus.IDLE);
        }
        deviceRepository.save(device);
    }

    /**
     * 验证设备Token
     */
    public Device verifyDeviceToken(String deviceToken) {
        if (deviceToken == null || deviceToken.isBlank()) {
            throw new BusinessException("UNAUTHORIZED", "设备Token无效");
        }
        return deviceRepository.findByDeviceTokenHash(FactoryProvisioningService.hash(deviceToken))
                .orElseThrow(() -> new BusinessException("UNAUTHORIZED", "设备Token无效"));
    }

    public void requireOwner(Device device, String deviceId) {
        if (!device.getDeviceId().equals(deviceId)) {
            throw new BusinessException("UNAUTHORIZED", "设备Token无效");
        }
    }

    /**
     * 使用仍有效的设备 Token 签发替换 Token。
     */
    @Transactional
    public String rotateDeviceToken(String deviceId) {
        Device device = getDevice(deviceId);
        String deviceToken = newToken();
        device.setDeviceTokenHash(FactoryProvisioningService.hash(deviceToken));
        deviceRepository.save(device);
        log.info("设备Token已轮换: deviceId={}", deviceId);
        return deviceToken;
    }

    /**
     * 获取设备信息
     */
    public Device getDevice(String deviceId) {
        return deviceRepository.findById(deviceId)
                .orElseThrow(() -> new BusinessException("DEVICE_NOT_FOUND", "设备不存在"));
    }

    private String newToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return java.util.HexFormat.of().formatHex(bytes);
    }

    public record Activation(Device device, String token) {
    }
}
