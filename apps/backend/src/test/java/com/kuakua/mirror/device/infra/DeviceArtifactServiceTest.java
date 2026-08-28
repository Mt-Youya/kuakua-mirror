package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.device.domain.DeviceImage;
import com.kuakua.mirror.shared.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeviceArtifactServiceTest {

    @Mock private DeviceImageRepository imageRepository;
    @Mock private SupabaseStorageService storageService;
    @Mock private MultipartFile file;

    private DeviceArtifactService service;

    @BeforeEach
    void setUp() {
        service = new DeviceArtifactService(imageRepository, storageService);
        ReflectionTestUtils.setField(service, "imageBucket", "device-images");
    }

    @Test
    void deletesUploadedImageWhenMetadataCannotBeSaved() throws Exception {
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(3L);
        when(file.getContentType()).thenReturn("image/jpeg");
        when(file.getBytes()).thenReturn(new byte[]{1, 2, 3});
        when(imageRepository.saveAndFlush(any(DeviceImage.class))).thenThrow(new IllegalStateException("database unavailable"));

        assertThrows(BusinessException.class, () -> service.uploadImage("device-1", file));
        verify(storageService).delete(anyString(), anyString());
    }
}
