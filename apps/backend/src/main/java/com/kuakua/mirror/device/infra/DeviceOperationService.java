package com.kuakua.mirror.device.infra;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kuakua.mirror.device.domain.DeviceDiagnosticLog;
import com.kuakua.mirror.device.domain.DeviceHeartbeat;
import com.kuakua.mirror.device.dto.DeviceHeartbeatRequest;
import com.kuakua.mirror.device.dto.DeviceLogRequest;
import com.kuakua.mirror.device.dto.HistoryQueryResponse;
import com.kuakua.mirror.shared.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class DeviceOperationService {

    private static final Set<String> LEVELS = Set.of("DEBUG", "INFO", "WARN", "ERROR");
    private final DeviceService deviceService;
    private final DeviceHeartbeatRepository heartbeatRepository;
    private final DeviceDiagnosticLogRepository logRepository;
    private final OtaUpdateRepository otaUpdateRepository;
    private final DeviceImageRepository imageRepository;
    private final SupabaseStorageService storageService;
    private final ObjectMapper objectMapper;

    @Transactional
    public void recordHeartbeat(String deviceId, DeviceHeartbeatRequest request) {
        deviceService.updateHeartbeat(deviceId);
        heartbeatRepository.save(DeviceHeartbeat.builder()
                .deviceId(deviceId)
                .uptime(request.getUptime())
                .memoryUsage(request.getMemoryUsage())
                .cpuUsage(request.getCpuUsage())
                .temperature(request.getTemperature())
                .recordedAt(LocalDateTime.now())
                .build());
    }

    public void recordDiagnosticLog(String deviceId, DeviceLogRequest request) {
        if (request.getMetadata() == null || request.getMessage() == null || request.getMessage().isBlank() || !LEVELS.contains(request.getLevel())) {
            throw new BusinessException("INVALID_DIAGNOSTIC_LOG", "诊断日志必须包含级别和结构化元数据");
        }
        try {
            String metadata = objectMapper.writeValueAsString(request.getMetadata());
            String all = request.getLevel() + "\n" + request.getMessage() + "\n" + metadata;
            if (all.getBytes(StandardCharsets.UTF_8).length > 16 * 1024
                    || all.matches("(?is).*(?:\\\"[^\\\"]*(token|audio|image)[^\\\"]*\\\"\\s*:.*|bearer\\s+\\S+|(?:token|audio|image)[\\w-]*\\s*[=:]\\S+|data:(?:image|audio)/[^,]*,\\S+).*")) {
                throw new BusinessException("INVALID_DIAGNOSTIC_LOG", "诊断日志包含不允许的内容或超出 16 KiB");
            }
            logRepository.save(DeviceDiagnosticLog.builder()
                    .deviceId(deviceId)
                    .timestamp(request.getTimestamp() == null ? System.currentTimeMillis() : request.getTimestamp())
                    .level(request.getLevel())
                    .message(request.getMessage())
                    .metadata(metadata)
                    .createdAt(LocalDateTime.now())
                    .build());
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException("INVALID_DIAGNOSTIC_LOG", "诊断日志格式无效");
        }
    }

    public HistoryQueryResponse history(String deviceId, String type, long start, long end, int limit, int offset) {
        if (!Set.of("all", "heartbeat", "ota", "log").contains(type) || start > end || limit < 1 || limit > 100 || offset < 0) {
            throw new BusinessException("INVALID_HISTORY_QUERY", "历史查询参数无效");
        }
        List<HistoryQueryResponse.HistoryRecord> records = new ArrayList<>();
        if ("all".equals(type) || "heartbeat".equals(type)) {
            heartbeatRepository.findByDeviceIdAndRecordedAtBetweenOrderByRecordedAtDesc(deviceId, time(start), time(end)).forEach(value ->
                    records.add(record(value.getRecordedAt(), "heartbeat", heartbeatData(value))));
        }
        if ("all".equals(type) || "ota".equals(type)) {
            otaUpdateRepository.findByDeviceIdOrderByUpdatedAtDesc(deviceId).stream()
                    .filter(value -> inRange(value.getUpdatedAt(), start, end)).forEach(value ->
                    records.add(record(value.getUpdatedAt(), "ota", otaData(value))));
        }
        if ("all".equals(type) || "log".equals(type)) {
            logRepository.findByDeviceIdAndTimestampBetweenOrderByTimestampDesc(deviceId, start, end).forEach(value ->
                    records.add(HistoryQueryResponse.HistoryRecord.builder().timestamp(value.getTimestamp()).type("log").data(Map.of("level", value.getLevel(), "message", value.getMessage(), "metadata", value.getMetadata())).build()));
        }
        records.sort(Comparator.comparing(HistoryQueryResponse.HistoryRecord::getTimestamp).reversed());
        int from = Math.min(offset, records.size());
        int to = Math.min(from + limit, records.size());
        return HistoryQueryResponse.builder().records(records.subList(from, to))
                .pagination(HistoryQueryResponse.Pagination.builder().total(records.size()).limit(limit).offset(offset).build()).build();
    }

    @Scheduled(cron = "0 15 3 * * *")
    @Transactional
    void cleanupExpired() {
        LocalDateTime now = LocalDateTime.now();
        imageRepository.findByUploadedAtBefore(now.minusDays(30)).forEach(image -> {
            storageService.delete(image.getStorageBucket(), image.getStoragePath());
            imageRepository.delete(image);
        });
        logRepository.deleteByCreatedAtBefore(now.minusDays(7));
        heartbeatRepository.deleteByRecordedAtBefore(now.minusDays(30));
        otaUpdateRepository.deleteByUpdatedAtBefore(now.minusDays(30));
    }

    private HistoryQueryResponse.HistoryRecord record(LocalDateTime value, String type, Map<String, Object> data) {
        return HistoryQueryResponse.HistoryRecord.builder().timestamp(value.toInstant(ZoneOffset.UTC).toEpochMilli()).type(type).data(data).build();
    }

    private LocalDateTime time(long epochMillis) {
        return LocalDateTime.ofInstant(Instant.ofEpochMilli(epochMillis), ZoneOffset.UTC);
    }

    private boolean inRange(LocalDateTime value, long start, long end) {
        long epoch = value.toInstant(ZoneOffset.UTC).toEpochMilli();
        return epoch >= start && epoch <= end;
    }

    private Map<String, Object> heartbeatData(DeviceHeartbeat value) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("uptime", value.getUptime());
        data.put("memoryUsage", value.getMemoryUsage());
        data.put("cpuUsage", value.getCpuUsage());
        data.put("temperature", value.getTemperature());
        return data;
    }

    private Map<String, Object> otaData(com.kuakua.mirror.device.domain.OtaUpdate value) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("version", value.getToVersion());
        data.put("status", value.getStatus());
        data.put("progress", value.getProgress());
        return data;
    }
}
