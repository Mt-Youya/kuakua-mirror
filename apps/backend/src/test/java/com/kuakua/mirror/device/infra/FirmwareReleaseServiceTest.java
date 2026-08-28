package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.device.domain.Device;
import com.kuakua.mirror.device.domain.FirmwareRelease;
import com.kuakua.mirror.shared.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FirmwareReleaseServiceTest {

    @Mock private FirmwareReleaseRepository releaseRepository;
    @Mock private OtaUpdateRepository otaUpdateRepository;
    @Mock private DeviceRepository deviceRepository;
    @Mock private SupabaseStorageService storageService;

    private FirmwareReleaseService service;

    @BeforeEach
    void setUp() {
        service = new FirmwareReleaseService(releaseRepository, otaUpdateRepository, deviceRepository, storageService);
        ReflectionTestUtils.setField(service, "firmwareBucket", "device-firmware");
        when(releaseRepository.findByModelAndChannelOrderByPublishedAtDesc("K10", "stable")).thenReturn(List.of());
    }

    @Test
    void refusesPublishingWithoutASigningKey() {
        assertThrows(BusinessException.class, () -> service.publish("K10", "1.0.1", new byte[]{1}, "notes"));
        verifyNoInteractions(storageService);
    }

    @Test
    void publishesAVerifiableVersionedManifest() throws Exception {
        KeyPair pair = KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
        ReflectionTestUtils.setField(service, "signingPrivateKey", Base64.getEncoder().encodeToString(pair.getPrivate().getEncoded()));
        when(releaseRepository.saveAndFlush(any(FirmwareRelease.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FirmwareRelease release = service.publish("K10", "1.0.1", "firmware".getBytes(StandardCharsets.UTF_8), "notes");

        Signature verifier = Signature.getInstance("Ed25519");
        verifier.initVerify(pair.getPublic());
        verifier.update(release.getManifest().getBytes(StandardCharsets.UTF_8));
        assertTrue(release.getManifest().startsWith("v1\nmodel=K10\nversion=1.0.1\nsha256="));
        assertTrue(verifier.verify(Base64.getDecoder().decode(release.getSignature())));
        verify(storageService).upload("device-firmware", "K10/1.0.1/firmware.bin", "application/octet-stream", "firmware".getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void exposesOnlyStrictlyNewerReleasesAndRejectsUnpublishedStatus() {
        FirmwareRelease current = release("1.0.0");
        FirmwareRelease newer = release("1.0.1");
        when(releaseRepository.findByModelAndChannelOrderByPublishedAtDesc("K10", "stable")).thenReturn(List.of(current, newer));
        Device device = Device.builder().model("K10").firmwareVersion("1.0.0").build();

        assertTrue(service.newerStableRelease(device) == newer);
        assertThrows(BusinessException.class, () -> service.reportStatus(device, "9.9.9", "success", 100, null));

        device.setFirmwareVersion("1.0.1");
        assertNull(service.newerStableRelease(device));
    }

    @Test
    void deletesUploadedFirmwareWhenMetadataCannotBeSaved() throws Exception {
        KeyPair pair = KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
        ReflectionTestUtils.setField(service, "signingPrivateKey", Base64.getEncoder().encodeToString(pair.getPrivate().getEncoded()));
        when(releaseRepository.saveAndFlush(any(FirmwareRelease.class))).thenThrow(new IllegalStateException("database unavailable"));

        assertThrows(IllegalStateException.class, () -> service.publish("K10", "1.0.1", new byte[]{1}, "notes"));
        verify(storageService).delete("device-firmware", "K10/1.0.1/firmware.bin");
    }

    private FirmwareRelease release(String version) {
        return FirmwareRelease.builder().model("K10").version(version).channel("stable").publishedAt(LocalDateTime.now()).build();
    }
}
