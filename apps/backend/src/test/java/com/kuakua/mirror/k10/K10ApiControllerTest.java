package com.kuakua.mirror.k10;

import com.kuakua.mirror.ai.infra.DashScopeService;
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

    @Test
    void ttsRejectsBlankText() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/tts")
                        .header("X-Device-ID", "k10-001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"device_id\":\"k10-001\",\"text\":\"\"}"))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(result))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void praiseStreamsTextAudioAndCompletion() throws Exception {
        when(dashScopeService.streamImagePraise(anyString())).thenReturn(Flux.just("你真棒"));
        when(dashScopeService.synthesize("你真棒")).thenReturn(Mono.just(new byte[44]));

        MvcResult result = mockMvc.perform(post("/api/praise/stream")
                        .header("X-Device-ID", "k10-001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"device_id\":\"k10-001\",\"image_base64\":\"AQID\"}"))
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
        when(dashScopeService.synthesize(anyString())).thenReturn(Mono.just(new byte[44]));

        for (int index = 0; index < 10; index++) {
            MvcResult result = mockMvc.perform(post("/api/tts")
                            .header("X-Device-ID", "k10-rate-test")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"device_id\":\"k10-rate-test\",\"text\":\"你好\"}"))
                    .andExpect(request().asyncStarted())
                    .andReturn();
            mockMvc.perform(asyncDispatch(result)).andExpect(status().isOk());
        }

        mockMvc.perform(post("/api/tts")
                        .header("X-Device-ID", "k10-rate-test")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"device_id\":\"k10-rate-test\",\"text\":\"你好\"}"))
                .andExpect(status().isTooManyRequests());
    }
}
