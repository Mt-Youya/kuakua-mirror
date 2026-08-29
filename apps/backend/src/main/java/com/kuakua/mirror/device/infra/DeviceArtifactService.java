package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.device.domain.DeviceImage;
import com.kuakua.mirror.shared.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeviceArtifactService {

    private static final long MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    private final DeviceImageRepository imageRepository;
    private final SupabaseStorageService storageService;

    @Value("${supabase.image-bucket:device-images}")
    private String imageBucket;

    @Transactional
    public DeviceImage uploadImage(String deviceId, MultipartFile file) {
        if (file.isEmpty() || file.getSize() > MAX_IMAGE_BYTES || !supportedImage(file.getContentType())) {
            throw new BusinessException("INVALID_IMAGE", "仅支持不超过 5 MiB 的 JPEG、PNG 或 WebP 图片");
        }
        String path = deviceId + "/" + UUID.randomUUID() + extension(file.getContentType());
        boolean uploaded = false;
        try {
            storageService.upload(imageBucket, path, file.getContentType(), file.getBytes());
            uploaded = true;
            return imageRepository.saveAndFlush(DeviceImage.builder()
                    .deviceId(deviceId)
                    .storageBucket(imageBucket)
                    .storagePath(path)
                    .fileSize(file.getSize())
                    .contentType(file.getContentType())
                    .uploadedAt(LocalDateTime.now())
                    .build());
        } catch (Exception exception) {
            if (uploaded) {
                try {
                    storageService.delete(imageBucket, path);
                } catch (Exception ignored) {
                }
            }
            if (exception instanceof BusinessException businessException) {
                throw businessException;
            }
            throw new BusinessException("ARTIFACT_STORAGE_UNAVAILABLE", "制品存储暂不可用");
        }
    }

    public List<DeviceImage> images(String deviceId) {
        return imageRepository.findByDeviceIdOrderByUploadedAtDesc(deviceId);
    }

    @Transactional
    public void deleteImages(String deviceId) {
        List<DeviceImage> images = images(deviceId);
        try {
            for (DeviceImage image : images) {
                if (image.getStorageBucket() != null && image.getStoragePath() != null) {
                    storageService.delete(image.getStorageBucket(), image.getStoragePath());
                }
            }
            imageRepository.deleteAll(images);
        } catch (Exception exception) {
            if (exception instanceof BusinessException businessException) {
                throw businessException;
            }
            throw new BusinessException("ARTIFACT_STORAGE_UNAVAILABLE", "制品存储暂不可用");
        }
    }

    public String signedImageUrl(DeviceImage image) {
        return storageService.signedDownloadUrl(image.getStorageBucket(), image.getStoragePath(), 600);
    }

    private boolean supportedImage(String contentType) {
        return "image/jpeg".equals(contentType) || "image/png".equals(contentType) || "image/webp".equals(contentType);
    }

    private String extension(String contentType) {
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }
}
