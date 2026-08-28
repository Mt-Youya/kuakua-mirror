package com.kuakua.mirror.k10;

import com.kuakua.mirror.ai.infra.DashScopeService;
import com.kuakua.mirror.device.infra.DeviceService;
import com.kuakua.mirror.device.infra.FactoryProvisioningService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class K10ApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DashScopeService dashScopeService;

    @Autowired
    private FactoryProvisioningService provisioningService;

    @Autowired
    private DeviceService deviceService;

    @Test
    void ttsRejectsBlankText() throws Exception {
        DeviceService.Activation activation = activate("tts-blank");
        MvcResult result = mockMvc.perform(post("/api/tts")
                        .header("X-Device-ID", activation.device().getDeviceId())
                        .header("Authorization", "Bearer " + activation.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"device_id\":\"" + activation.device().getDeviceId() + "\",\"text\":\"\"}"))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(result))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void praiseStreamsTextAudioAndCompletion() throws Exception {
        DeviceService.Activation activation = activate("praise");
        when(dashScopeService.streamImagePraise(anyString())).thenReturn(Flux.just("你真棒"));
        when(dashScopeService.synthesize("你真棒")).thenReturn(Mono.just(new byte[44]));

        MvcResult result = mockMvc.perform(post("/api/praise/stream")
                        .header("X-Device-ID", activation.device().getDeviceId())
                        .header("Authorization", "Bearer " + activation.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"device_id\":\"" + activation.device().getDeviceId() + "\",\"image_base64\":\"AQID\"}"))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(result))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("\"type\" : \"text\"")))
                .andExpect(content().string(containsString("\"type\" : \"audio\"")))
                .andExpect(content().string(containsString("\"type\" : \"complete\"")));
    }

    @Test
    void rejectsTheEleventhRequestFromOneDeviceWithinAMinute() throws Exception {
        DeviceService.Activation activation = activate("rate");
        when(dashScopeService.synthesize(anyString())).thenReturn(Mono.just(new byte[44]));

        for (int index = 0; index < 10; index++) {
            MvcResult result = mockMvc.perform(post("/api/tts")
                            .header("X-Device-ID", activation.device().getDeviceId())
                            .header("Authorization", "Bearer " + activation.token())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"device_id\":\"" + activation.device().getDeviceId() + "\",\"text\":\"你好\"}"))
                    .andExpect(request().asyncStarted())
                    .andReturn();
            mockMvc.perform(asyncDispatch(result)).andExpect(status().isOk());
        }

        mockMvc.perform(post("/api/tts")
                        .header("X-Device-ID", activation.device().getDeviceId())
                        .header("Authorization", "Bearer " + activation.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"device_id\":\"" + activation.device().getDeviceId() + "\",\"text\":\"你好\"}"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void rejectsAValidTokenClaimingAnotherDevice() throws Exception {
        DeviceService.Activation first = activate("first");
        DeviceService.Activation second = activate("second");

        mockMvc.perform(post("/api/tts")
                        .header("X-Device-ID", second.device().getDeviceId())
                        .header("Authorization", "Bearer " + first.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"device_id\":\"" + second.device().getDeviceId() + "\",\"text\":\"你好\"}"))
                .andExpect(status().isUnauthorized());
    }

    private DeviceService.Activation activate(String suffix) {
        String serial = "K10-" + suffix;
        String code = "factory-" + suffix;
        provisioningService.provision("K10", serial, "1.0.0", code, "FACTORY");
        return deviceService.activateDevice(code, "K10", serial, "1.0.0", null);
    }
}
