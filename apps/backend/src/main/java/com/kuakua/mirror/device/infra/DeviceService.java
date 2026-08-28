package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.device.domain.Device;
import com.kuakua.mirror.device.domain.DeviceConfig;
import com.kuakua.mirror.device.domain.DeviceStatus;
import com.kuakua.mirror.shared.exception.BusinessException;
import com.kuakua.mirror.shared.util.IdGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 设备服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final DeviceConfigRepository deviceConfigRepository;

    /**
     * 设备激活
     */
    @Transactional
    public Device activateDevice(String activationCode, String model, String serialNumber,
                                  String firmwareVersion, String macAddress) {
        // 验证激活码（简化版，实际应该预先生成激活码）
        if (activationCode == null || activationCode.length() < 6) {
            throw new BusinessException("INVALID_ACTIVATION_CODE", "激活码无效");
        }

        // 检查设备是否已激活
        deviceRepository.findByActivationCode(activationCode)
                .ifPresent(device -> {
                    throw new BusinessException("DEVICE_ALREADY_ACTIVATED", "设备已激活");
                });

        // 生成设备ID和Token
        String deviceId = "device_" + IdGenerator.generateId();
        String deviceToken = UUID.randomUUID().toString().replace("-", "");

        // 创建设备
        Device device = Device.builder()
                .deviceId(deviceId)
                .activationCode(activationCode)
                .model(model)
                .serialNumber(serialNumber)
                .firmwareVersion(firmwareVersion)
                .macAddress(macAddress)
                .deviceToken(deviceToken)
                .status(DeviceStatus.OFFLINE)
                .activatedAt(LocalDateTime.now())
                .build();

        device = deviceRepository.save(device);

        // 创建默认配置
        DeviceConfig config = DeviceConfig.builder()
                .deviceId(deviceId)
                .volume(50)
                .brightness(80)
                .wakeWord("你好镜子")
                .language("zh-CN")
                .timezone("Asia/Shanghai")
                .autoUpdate(true)
                .build();

        deviceConfigRepository.save(config);

        log.info("设备激活成功: deviceId={}", deviceId);
        return device;
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
        return deviceRepository.findByDeviceToken(deviceToken)
                .orElseThrow(() -> new BusinessException("UNAUTHORIZED", "设备Token无效"));
    }

    /**
     * 获取设备信息
     */
    public Device getDevice(String deviceId) {
        return deviceRepository.findById(deviceId)
                .orElseThrow(() -> new BusinessException("DEVICE_NOT_FOUND", "设备不存在"));
    }
}
