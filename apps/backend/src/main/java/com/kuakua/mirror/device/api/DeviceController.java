package com.kuakua.mirror.device.api;

import com.kuakua.mirror.device.domain.Device;
import com.kuakua.mirror.device.domain.DeviceConfig;
import com.kuakua.mirror.device.dto.*;
import com.kuakua.mirror.device.infra.DeviceService;
import com.kuakua.mirror.shared.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 设备管理REST API
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService deviceService;

    /**
     * 设备激活
     * POST /api/v1/devices/activate
     */
    @PostMapping("/activate")
    public ResponseEntity<ApiResponse<DeviceActivateResponse>> activateDevice(
            @RequestBody DeviceActivateRequest request) {

        log.info("设备激活请求: activationCode={}", request.getActivationCode());

        Device device = deviceService.activateDevice(
                request.getActivationCode(),
                request.getDeviceInfo().getModel(),
                request.getDeviceInfo().getSerialNumber(),
                request.getDeviceInfo().getFirmwareVersion(),
                request.getDeviceInfo().getMacAddress()
        );

        DeviceActivateResponse response = DeviceActivateResponse.builder()
                .deviceId(device.getDeviceId())
                .token(device.getDeviceToken())
                .message("设备激活成功")
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 获取设备配置
     * GET /api/v1/devices/{deviceId}/config
     */
    @GetMapping("/{deviceId}/config")
    public ResponseEntity<ApiResponse<DeviceConfigResponse>> getDeviceConfig(
            @PathVariable String deviceId,
            @RequestHeader("Authorization") String authHeader) {

        // 验证Bearer Token
        String token = extractToken(authHeader);
        deviceService.verifyDeviceToken(token);

        DeviceConfig config = deviceService.getDeviceConfig(deviceId);

        DeviceConfigResponse response = DeviceConfigResponse.builder()
                .volume(config.getVolume())
                .brightness(config.getBrightness())
                .wakeWord(config.getWakeWord())
                .language(config.getLanguage())
                .timezone(config.getTimezone())
                .autoUpdate(config.getAutoUpdate())
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 更新设备配置
     * PATCH /api/v1/devices/{deviceId}/config
     */
    @PatchMapping("/{deviceId}/config")
    public ResponseEntity<ApiResponse<DeviceConfigResponse>> updateDeviceConfig(
            @PathVariable String deviceId,
            @RequestHeader("Authorization") String authHeader,
            @RequestBody DeviceConfigUpdateRequest request) {

        String token = extractToken(authHeader);
        deviceService.verifyDeviceToken(token);

        DeviceConfig updates = DeviceConfig.builder()
                .volume(request.getVolume())
                .brightness(request.getBrightness())
                .wakeWord(request.getWakeWord())
                .language(request.getLanguage())
                .timezone(request.getTimezone())
                .autoUpdate(request.getAutoUpdate())
                .build();

        DeviceConfig config = deviceService.updateDeviceConfig(deviceId, updates);

        DeviceConfigResponse response = DeviceConfigResponse.builder()
                .volume(config.getVolume())
                .brightness(config.getBrightness())
                .wakeWord(config.getWakeWord())
                .language(config.getLanguage())
                .timezone(config.getTimezone())
                .autoUpdate(config.getAutoUpdate())
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 设备心跳
     * POST /api/v1/devices/{deviceId}/heartbeat
     */
    @PostMapping("/{deviceId}/heartbeat")
    public ResponseEntity<ApiResponse<String>> deviceHeartbeat(
            @PathVariable String deviceId,
            @RequestHeader("Authorization") String authHeader,
            @RequestBody DeviceHeartbeatRequest request) {

        String token = extractToken(authHeader);
        deviceService.verifyDeviceToken(token);

        deviceService.updateHeartbeat(deviceId);

        log.debug("设备心跳: deviceId={}, uptime={}, memory={}, cpu={}, temp={}",
                deviceId, request.getUptime(), request.getMemoryUsage(),
                request.getCpuUsage(), request.getTemperature());

        return ResponseEntity.ok(ApiResponse.success("心跳已记录"));
    }

    /**
     * 图片上传
     * POST /api/v1/devices/{deviceId}/images
     */
    @PostMapping("/{deviceId}/images")
    public ResponseEntity<ApiResponse<String>> uploadImage(
            @PathVariable String deviceId,
            @RequestHeader("Authorization") String authHeader,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {

        String token = extractToken(authHeader);
        deviceService.verifyDeviceToken(token);

        // TODO: 实现图片存储逻辑（S3/OSS/本地存储）
        String imageUrl = "https://example.com/images/" + deviceId + "/" + file.getOriginalFilename();

        log.info("图片上传成功: deviceId={}, filename={}, size={}",
                deviceId, file.getOriginalFilename(), file.getSize());

        return ResponseEntity.ok(ApiResponse.success(imageUrl));
    }

    /**
     * OTA检查更新
     * GET /api/v1/devices/{deviceId}/ota/check
     */
    @GetMapping("/{deviceId}/ota/check")
    public ResponseEntity<ApiResponse<OTACheckResponse>> checkOTAUpdate(
            @PathVariable String deviceId,
            @RequestHeader("Authorization") String authHeader) {

        String token = extractToken(authHeader);
        Device device = deviceService.verifyDeviceToken(token);

        // TODO: 实际的OTA更新逻辑
        String currentVersion = device.getFirmwareVersion();
        String latestVersion = "1.0.0";

        OTACheckResponse response = OTACheckResponse.builder()
                .updateAvailable(false)
                .version(latestVersion)
                .downloadUrl(null)
                .fileSize(null)
                .checksum(null)
                .releaseNotes("当前已是最新版本")
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * OTA状态上报
     * POST /api/v1/devices/{deviceId}/ota/status
     */
    @PostMapping("/{deviceId}/ota/status")
    public ResponseEntity<ApiResponse<String>> reportOTAStatus(
            @PathVariable String deviceId,
            @RequestHeader("Authorization") String authHeader,
            @RequestBody OTAStatusRequest request) {

        String token = extractToken(authHeader);
        deviceService.verifyDeviceToken(token);

        log.info("OTA状态上报: deviceId={}, status={}, progress={}",
                deviceId, request.getStatus(), request.getProgress());

        // TODO: 存储OTA状态到数据库

        return ResponseEntity.ok(ApiResponse.success("OTA状态已记录"));
    }

    /**
     * 设备日志上传
     * POST /api/v1/devices/{deviceId}/logs
     */
    @PostMapping("/{deviceId}/logs")
    public ResponseEntity<ApiResponse<String>> uploadLogs(
            @PathVariable String deviceId,
            @RequestHeader("Authorization") String authHeader,
            @RequestBody DeviceLogRequest request) {

        String token = extractToken(authHeader);
        deviceService.verifyDeviceToken(token);

        log.info("设备日志: deviceId={}, level={}, message={}",
                deviceId, request.getLevel(), request.getMessage());

        // TODO: 存储日志到日志系统（ELK/Loki等）

        return ResponseEntity.ok(ApiResponse.success("日志已接收"));
    }

    /**
     * 历史数据查询
     * GET /api/v1/devices/{deviceId}/history
     */
    @GetMapping("/{deviceId}/history")
    public ResponseEntity<ApiResponse<HistoryQueryResponse>> queryHistory(
            @PathVariable String deviceId,
            @RequestHeader("Authorization") String authHeader,
            @RequestParam String type,
            @RequestParam Long start,
            @RequestParam Long end,
            @RequestParam(defaultValue = "100") Integer limit,
            @RequestParam(defaultValue = "0") Integer offset) {

        String token = extractToken(authHeader);
        deviceService.verifyDeviceToken(token);

        log.info("历史数据查询: deviceId={}, type={}, start={}, end={}",
                deviceId, type, start, end);

        // TODO: 从数据库查询历史数据
        HistoryQueryResponse response = HistoryQueryResponse.builder()
                .records(java.util.Collections.emptyList())
                .pagination(HistoryQueryResponse.Pagination.builder()
                        .total(0)
                        .limit(limit)
                        .offset(offset)
                        .build())
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 从Authorization header提取token
     */
    private String extractToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Invalid Authorization header");
        }
        return authHeader.substring(7);
    }
}
