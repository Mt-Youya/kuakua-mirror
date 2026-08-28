package com.kuakua.mirror.device;

import com.kuakua.mirror.device.infra.FactoryProvisioningService;
import com.kuakua.mirror.device.infra.SupabaseStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@SpringBootTest
@AutoConfigureMockMvc
class DeviceLifecycleIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FactoryProvisioningService provisioningService;

    @MockBean
    private SupabaseStorageService storageService;

    @Test
    void onlyAPreRegisteredDeviceCanActivateAndUseItsOwnToken() throws Exception {
        var firstDevice = provisioningService.provision("K10", "SN-001", "1.0.0", "factory-code-001", "FACTORY");

        var activation = mockMvc.perform(post("/api/v1/devices/activate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"activationCode":"factory-code-001","deviceInfo":{"model":"K10","serialNumber":"SN-001","firmwareVersion":"1.0.0"}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.deviceId").exists())
                .andExpect(jsonPath("$.data.token").exists())
                .andReturn();
        String token = activation.getResponse().getContentAsString().replaceFirst("(?s).*\\\"token\\\"\\s*:\\s*\\\"([^\\\"]+)\\\".*", "$1");
        when(storageService.signedDownloadUrl(anyString(), anyString(), anyInt())).thenReturn("https://signed.example/image");
        var secondDevice = provisioningService.provision("K10", "SN-002", "1.0.0", "factory-code-002", "FACTORY");

        mockMvc.perform(post("/api/v1/devices/activate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"activationCode":"factory-code-001","deviceInfo":{"model":"K10","serialNumber":"SN-001","firmwareVersion":"1.0.0"}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("ACTIVATION_CODE_INVALID"));

        mockMvc.perform(get("/api/v1/devices/" + firstDevice.getDeviceId() + "/config")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/devices/" + secondDevice.getDeviceId() + "/config")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/devices/" + firstDevice.getDeviceId() + "/config")
                        .header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(multipart("/api/v1/devices/" + firstDevice.getDeviceId() + "/images")
                        .file(new MockMultipartFile("file", "not-an-image.txt", "text/plain", "no".getBytes()))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());

        mockMvc.perform(multipart("/api/v1/devices/" + firstDevice.getDeviceId() + "/images")
                        .file(new MockMultipartFile("file", "image.jpg", "image/jpeg", new byte[]{1, 2, 3}))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("https://signed.example/image"));
        mockMvc.perform(get("/api/v1/devices/" + firstDevice.getDeviceId() + "/images")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].downloadUrl").value("https://signed.example/image"));

        mockMvc.perform(post("/api/v1/devices/" + firstDevice.getDeviceId() + "/logs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"WARN\",\"message\":\"diagnostic\",\"metadata\":{\"image\":\"base64\"}}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/devices/" + firstDevice.getDeviceId() + "/logs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"WARN\",\"message\":\"token=secret-value\",\"metadata\":{\"reason\":\"data:image/jpeg;base64,AQID\"}}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/devices/" + firstDevice.getDeviceId() + "/logs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"timestamp\":1730000000000,\"level\":\"WARN\",\"message\":\"wifi reconnect\",\"metadata\":{\"reason\":\"timeout\"}}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/devices/" + firstDevice.getDeviceId() + "/history")
                        .header("Authorization", "Bearer " + token)
                        .param("type", "log")
                        .param("start", "0")
                        .param("end", "2000000000000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records[0].type").value("log"));

        provisioningService.provision("K10", "SN-001", "1.0.0", "recovery-code-001", "RECOVERY");
        var recovery = mockMvc.perform(post("/api/v1/devices/activate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"activationCode":"recovery-code-001","deviceInfo":{"model":"K10","serialNumber":"SN-001","firmwareVersion":"1.0.0"}}
                                """))
                .andExpect(status().isOk())
                .andReturn();
        String recoveryToken = recovery.getResponse().getContentAsString().replaceFirst("(?s).*\\\"token\\\"\\s*:\\s*\\\"([^\\\"]+)\\\".*", "$1");

        mockMvc.perform(get("/api/v1/devices/" + firstDevice.getDeviceId() + "/config")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/devices/" + firstDevice.getDeviceId() + "/config")
                        .header("Authorization", "Bearer " + recoveryToken))
                .andExpect(status().isOk());
    }
}
