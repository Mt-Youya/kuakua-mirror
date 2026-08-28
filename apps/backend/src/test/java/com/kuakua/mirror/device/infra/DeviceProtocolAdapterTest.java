package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.ai.infra.realtime.OpenAIRealtimeMessage;
import com.kuakua.mirror.device.dto.DeviceMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class DeviceProtocolAdapterTest {

    private DeviceProtocolAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new DeviceProtocolAdapter();
    }

    // ========== translateToOpenAI 测试 ==========

    @Test
    void testTranslateToOpenAI_Audio() {
        // 设备发送音频数据
        DeviceMessage deviceMsg = DeviceMessage.audio("base64AudioData");

        OpenAIRealtimeMessage openAIMsg = adapter.translateToOpenAI(deviceMsg);

        assertNotNull(openAIMsg);
        assertEquals("input_audio_buffer.append", openAIMsg.getType());
        assertEquals("base64AudioData", openAIMsg.getAudio());
    }

    @Test
    void testTranslateToOpenAI_AudioEnd() {
        // 设备发送音频结束
        DeviceMessage deviceMsg = DeviceMessage.audioEnd();

        OpenAIRealtimeMessage openAIMsg = adapter.translateToOpenAI(deviceMsg);

        assertNotNull(openAIMsg);
        assertEquals("input_audio_buffer.commit", openAIMsg.getType());
    }

    @Test
    void testTranslateToOpenAI_Text() {
        // 文本输入（MVP 阶段暂不支持）
        DeviceMessage deviceMsg = DeviceMessage.text("测试文本");

        OpenAIRealtimeMessage openAIMsg = adapter.translateToOpenAI(deviceMsg);

        // 当前实现返回 null
        assertNull(openAIMsg);
    }

    @Test
    void testTranslateToOpenAI_Heartbeat() {
        // 心跳消息不需要转发给 OpenAI
        DeviceMessage deviceMsg = DeviceMessage.heartbeat(System.currentTimeMillis());

        OpenAIRealtimeMessage openAIMsg = adapter.translateToOpenAI(deviceMsg);

        assertNull(openAIMsg);
    }

    @Test
    void testTranslateToOpenAI_DeviceInfo() {
        // 设备信息不需要转发给 OpenAI
        DeviceMessage deviceMsg = DeviceMessage.deviceInfo(
                "mirror_001",
                "1.0.0",
                List.of("audio", "display", "button")
        );

        OpenAIRealtimeMessage openAIMsg = adapter.translateToOpenAI(deviceMsg);

        assertNull(openAIMsg);
    }

    @Test
    void testTranslateToOpenAI_NullMessage() {
        OpenAIRealtimeMessage openAIMsg = adapter.translateToOpenAI(null);
        assertNull(openAIMsg);
    }

    @Test
    void testTranslateToOpenAI_NullType() {
        DeviceMessage deviceMsg = DeviceMessage.builder().type(null).build();
        OpenAIRealtimeMessage openAIMsg = adapter.translateToOpenAI(deviceMsg);
        assertNull(openAIMsg);
    }

    @Test
    void testTranslateToOpenAI_AudioWithNullData() {
        // 音频消息但数据为空
        DeviceMessage deviceMsg = DeviceMessage.builder()
                .type("audio")
                .data(null)
                .build();

        OpenAIRealtimeMessage openAIMsg = adapter.translateToOpenAI(deviceMsg);

        assertNull(openAIMsg);
    }

    // ========== translateFromOpenAI 测试 ==========

    @Test
    void testTranslateFromOpenAI_TranscriptCompleted() {
        // OpenAI 返回转写完成
        OpenAIRealtimeMessage openAIMsg = OpenAIRealtimeMessage.conversationItemInputAudioTranscriptionCompleted(
                "item_123",
                "今天心情不好"
        );

        DeviceMessage deviceMsg = adapter.translateFromOpenAI(openAIMsg);

        assertNotNull(deviceMsg);
        assertEquals("transcript", deviceMsg.getType());
        assertEquals("今天心情不好", deviceMsg.getText());
    }

    @Test
    void testTranslateFromOpenAI_AudioDelta() {
        // OpenAI 返回音频增量
        OpenAIRealtimeMessage openAIMsg = OpenAIRealtimeMessage.responseAudioDelta(
                "resp_123",
                0,
                0,
                "base64AudioChunk"
        );

        DeviceMessage deviceMsg = adapter.translateFromOpenAI(openAIMsg);

        assertNotNull(deviceMsg);
        assertEquals("audio_response", deviceMsg.getType());
        assertEquals("base64AudioChunk", deviceMsg.getData());
        assertFalse(deviceMsg.getIsFinal());
    }

    @Test
    void testTranslateFromOpenAI_AudioDone() {
        // OpenAI 音频响应完成
        OpenAIRealtimeMessage openAIMsg = OpenAIRealtimeMessage.builder()
                .type("response.audio.done")
                .responseId("resp_123")
                .build();

        DeviceMessage deviceMsg = adapter.translateFromOpenAI(openAIMsg);

        assertNotNull(deviceMsg);
        assertEquals("audio_response_end", deviceMsg.getType());
    }

    @Test
    void testTranslateFromOpenAI_AudioTranscriptDelta() {
        // OpenAI 返回音频转写文本增量（AI说话时的实时字幕）
        OpenAIRealtimeMessage openAIMsg = OpenAIRealtimeMessage.responseAudioTranscriptDelta(
                "resp_123",
                0,
                0,
                "我听到了"
        );

        DeviceMessage deviceMsg = adapter.translateFromOpenAI(openAIMsg);

        assertNotNull(deviceMsg);
        assertEquals("response_text", deviceMsg.getType());
        assertEquals("我听到了", deviceMsg.getText());
    }

    @Test
    void testTranslateFromOpenAI_TextDelta() {
        // OpenAI 返回文本增量
        OpenAIRealtimeMessage openAIMsg = OpenAIRealtimeMessage.responseTextDelta(
                "resp_123",
                0,
                0,
                "能跟我说说"
        );

        DeviceMessage deviceMsg = adapter.translateFromOpenAI(openAIMsg);

        assertNotNull(deviceMsg);
        assertEquals("response_text", deviceMsg.getType());
        assertEquals("能跟我说说", deviceMsg.getText());
    }

    @Test
    void testTranslateFromOpenAI_Error() {
        // OpenAI 返回错误
        OpenAIRealtimeMessage openAIMsg = OpenAIRealtimeMessage.error(
                "ASR_FAILED",
                "语音识别失败"
        );

        DeviceMessage deviceMsg = adapter.translateFromOpenAI(openAIMsg);

        assertNotNull(deviceMsg);
        assertEquals("error", deviceMsg.getType());
        assertEquals("ASR_FAILED", deviceMsg.getCode());
        assertEquals("语音识别失败", deviceMsg.getMessage());
    }

    @Test
    void testTranslateFromOpenAI_ErrorWithNullDetail() {
        // OpenAI 返回错误但详情为空
        OpenAIRealtimeMessage openAIMsg = OpenAIRealtimeMessage.builder()
                .type("error")
                .error(null)
                .build();

        DeviceMessage deviceMsg = adapter.translateFromOpenAI(openAIMsg);

        assertNotNull(deviceMsg);
        assertEquals("error", deviceMsg.getType());
        assertEquals("UNKNOWN_ERROR", deviceMsg.getCode());
        assertEquals("未知错误", deviceMsg.getMessage());
    }

    @Test
    void testTranslateFromOpenAI_ResponseDone() {
        // OpenAI 响应完成（不需要转发给设备）
        OpenAIRealtimeMessage openAIMsg = OpenAIRealtimeMessage.responseDone("resp_123");

        DeviceMessage deviceMsg = adapter.translateFromOpenAI(openAIMsg);

        assertNull(deviceMsg);
    }

    @Test
    void testTranslateFromOpenAI_SessionCreated() {
        // OpenAI 会话创建（内部状态事件，不需要转发）
        OpenAIRealtimeMessage openAIMsg = OpenAIRealtimeMessage.builder()
                .type("session.created")
                .build();

        DeviceMessage deviceMsg = adapter.translateFromOpenAI(openAIMsg);

        assertNull(deviceMsg);
    }

    @Test
    void testTranslateFromOpenAI_NullMessage() {
        DeviceMessage deviceMsg = adapter.translateFromOpenAI(null);
        assertNull(deviceMsg);
    }

    @Test
    void testTranslateFromOpenAI_NullType() {
        OpenAIRealtimeMessage openAIMsg = OpenAIRealtimeMessage.builder().type(null).build();
        DeviceMessage deviceMsg = adapter.translateFromOpenAI(openAIMsg);
        assertNull(deviceMsg);
    }

    @Test
    void testTranslateFromOpenAI_TranscriptWithNullText() {
        // 转写完成但文本为空
        OpenAIRealtimeMessage openAIMsg = OpenAIRealtimeMessage.builder()
                .type("conversation.item.input_audio_transcription.completed")
                .transcript(null)
                .build();

        DeviceMessage deviceMsg = adapter.translateFromOpenAI(openAIMsg);

        assertNull(deviceMsg);
    }

    @Test
    void testTranslateFromOpenAI_AudioDeltaWithNullData() {
        // 音频增量但数据为空
        OpenAIRealtimeMessage openAIMsg = OpenAIRealtimeMessage.builder()
                .type("response.audio.delta")
                .delta(null)
                .build();

        DeviceMessage deviceMsg = adapter.translateFromOpenAI(openAIMsg);

        assertNull(deviceMsg);
    }

    // ========== 双向转换测试 ==========

    @Test
    void testRoundTrip_AudioFlow() {
        // 模拟完整的音频对话流程

        // 1. 设备发送音频
        DeviceMessage deviceAudio = DeviceMessage.audio("userAudioData");
        OpenAIRealtimeMessage openAIAppend = adapter.translateToOpenAI(deviceAudio);
        assertEquals("input_audio_buffer.append", openAIAppend.getType());

        // 2. 设备发送音频结束
        DeviceMessage deviceAudioEnd = DeviceMessage.audioEnd();
        OpenAIRealtimeMessage openAICommit = adapter.translateToOpenAI(deviceAudioEnd);
        assertEquals("input_audio_buffer.commit", openAICommit.getType());

        // 3. OpenAI 返回转写
        OpenAIRealtimeMessage openAITranscript = OpenAIRealtimeMessage
                .conversationItemInputAudioTranscriptionCompleted("item_1", "用户说的话");
        DeviceMessage deviceTranscript = adapter.translateFromOpenAI(openAITranscript);
        assertEquals("transcript", deviceTranscript.getType());
        assertEquals("用户说的话", deviceTranscript.getText());

        // 4. OpenAI 返回音频响应
        OpenAIRealtimeMessage openAIAudio = OpenAIRealtimeMessage
                .responseAudioDelta("resp_1", 0, 0, "aiAudioData");
        DeviceMessage deviceAudioResponse = adapter.translateFromOpenAI(openAIAudio);
        assertEquals("audio_response", deviceAudioResponse.getType());
        assertEquals("aiAudioData", deviceAudioResponse.getData());

        // 5. OpenAI 音频结束
        OpenAIRealtimeMessage openAIAudioDone = OpenAIRealtimeMessage.builder()
                .type("response.audio.done")
                .build();
        DeviceMessage deviceAudioEnd2 = adapter.translateFromOpenAI(openAIAudioDone);
        assertEquals("audio_response_end", deviceAudioEnd2.getType());
    }
}
