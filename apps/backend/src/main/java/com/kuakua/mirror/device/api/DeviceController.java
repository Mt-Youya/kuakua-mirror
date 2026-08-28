package com.kuakua.mirror.device.api;

import com.kuakua.mirror.device.domain.Device;
import com.kuakua.mirror.device.domain.DeviceConfig;
import com.kuakua.mirror.device.dto.*;
import com.kuakua.mirror.device.infra.DeviceService;
import com.kuakua.mirror.device.infra.DeviceArtifactService;
import com.kuakua.mirror.device.infra.FirmwareReleaseService;
import com.kuakua.mirror.device.infra.DeviceOperationService;
import com.kuakua.mirror.shared.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    private final DeviceArtifactService artifactService;
    private final FirmwareReleaseService firmwareReleaseService;
    private final DeviceOperationService operationService;

    /**
     * 设备激活
     * POST /api/v1/devices/activate
     */
    @PostMapping("/activate")
    public ResponseEntity<ApiResponse<DeviceActivateResponse>> activateDevice(
            @RequestBody DeviceActivateRequest request) {

        DeviceService.Activation activation = deviceService.activateDevice(
                request.getActivationCode(),
                request.getDeviceInfo().getModel(),
                request.getDeviceInfo().getSerialNumber(),
                request.getDeviceInfo().getFirmwareVersion(),
                request.getDeviceInfo().getMacAddress()
        );

        DeviceActivateResponse response = DeviceActivateResponse.builder()
                .deviceId(activation.device().getDeviceId())
                .token(activation.token())
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
            @AuthenticationPrincipal Device device) {
        owned(device, deviceId);

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
            @AuthenticationPrincipal Device device,
            @RequestBody DeviceConfigUpdateRequest request) {
        owned(device, deviceId);

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
            @AuthenticationPrincipal Device device,
            @RequestBody DeviceHeartbeatRequest request) {
        owned(device, deviceId);

        operationService.recordHeartbeat(deviceId, request);

        return ResponseEntity.ok(ApiResponse.success("心跳已记录"));
    }

    /**
     * 图片上传
     * POST /api/v1/devices/{deviceId}/images
     */
    @PostMapping("/{deviceId}/images")
    public ResponseEntity<ApiResponse<String>> uploadImage(
            @PathVariable String deviceId,
            @AuthenticationPrincipal Device device,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        owned(device, deviceId);

        var image = artifactService.uploadImage(deviceId, file);
        return ResponseEntity.ok(ApiResponse.success(artifactService.signedImageUrl(image)));
    }

    @GetMapping("/{deviceId}/images")
    public ResponseEntity<ApiResponse<java.util.List<java.util.Map<String, Object>>>> images(
            @PathVariable String deviceId, @AuthenticationPrincipal Device device) {
        owned(device, deviceId);
        var result = artifactService.images(deviceId).stream().map(image -> java.util.Map.<String, Object>of(
                "id", image.getId(), "contentType", image.getContentType(), "fileSize", image.getFileSize(),
                "uploadedAt", image.getUploadedAt().toString(), "downloadUrl", artifactService.signedImageUrl(image))).toList();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * OTA检查更新
     * GET /api/v1/devices/{deviceId}/ota/check
     */
    @GetMapping("/{deviceId}/ota/check")
    public ResponseEntity<ApiResponse<OTACheckResponse>> checkOTAUpdate(
            @PathVariable String deviceId,
            @AuthenticationPrincipal Device device) {
        owned(device, deviceId);

        var release = firmwareReleaseService.newerStableRelease(device);
        OTACheckResponse response = OTACheckResponse.builder()
                .updateAvailable(release != null)
                .version(release == null ? device.getFirmwareVersion() : release.getVersion())
                .downloadUrl(release == null ? null : firmwareReleaseService.signedDownloadUrl(release))
                .fileSize(release == null ? null : release.getFileSize())
                .checksum(release == null ? null : release.getChecksum())
                .manifest(release == null ? null : release.getManifest())
                .signature(release == null ? null : release.getSignature())
                .releaseNotes(release == null ? "当前已是最新版本" : release.getReleaseNotes())
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
            @AuthenticationPrincipal Device device,
            @RequestBody OTAStatusRequest request) {
        owned(device, deviceId);

        firmwareReleaseService.reportStatus(device, request.getVersion(), request.getStatus(), request.getProgress(), request.getError());

        return ResponseEntity.ok(ApiResponse.success("OTA状态已记录"));
    }

    /**
     * 设备日志上传
     * POST /api/v1/devices/{deviceId}/logs
     */
    @PostMapping("/{deviceId}/logs")
    public ResponseEntity<ApiResponse<String>> uploadLogs(
            @PathVariable String deviceId,
            @AuthenticationPrincipal Device device,
            @RequestBody DeviceLogRequest request) {
        owned(device, deviceId);

        operationService.recordDiagnosticLog(deviceId, request);

        return ResponseEntity.ok(ApiResponse.success("日志已接收"));
    }

    /**
     * 历史数据查询
     * GET /api/v1/devices/{deviceId}/history
     */
    @GetMapping("/{deviceId}/history")
    public ResponseEntity<ApiResponse<HistoryQueryResponse>> queryHistory(
            @PathVariable String deviceId,
            @AuthenticationPrincipal Device device,
            @RequestParam String type,
            @RequestParam Long start,
            @RequestParam Long end,
            @RequestParam(defaultValue = "100") Integer limit,
            @RequestParam(defaultValue = "0") Integer offset) {

        owned(device, deviceId);

        HistoryQueryResponse response = operationService.history(deviceId, type, start, end, limit, offset);

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 从Authorization header提取token
     */
    private void owned(Device device, String deviceId) {
        deviceService.requireOwner(device, deviceId);
    }
}
