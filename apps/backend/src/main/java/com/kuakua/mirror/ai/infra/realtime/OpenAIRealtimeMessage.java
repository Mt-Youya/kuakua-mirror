package com.kuakua.mirror.ai.infra.realtime;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * OpenAI Realtime API 消息
 *
 * 支持的消息类型：
 * - input_audio_buffer.append: 添加音频到输入缓冲区
 * - input_audio_buffer.commit: 提交音频缓冲区
 * - conversation.item.input_audio_transcription.completed: 音频转写完成
 * - response.audio.delta: 音频响应增量
 * - response.audio_transcript.delta: 音频转写文本增量
 * - response.text.delta: 文本响应增量
 * - response.done: 响应完成
 * - error: 错误
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class OpenAIRealtimeMessage {

    /**
     * 消息类型
     */
    private String type;

    /**
     * Base64编码的音频数据（用于 input_audio_buffer.append、response.audio.delta）
     */
    private String audio;

    /**
     * 转写文本（用于 conversation.item.input_audio_transcription.completed）
     */
    private String transcript;

    /**
     * 增量数据（用于 response.audio.delta、response.text.delta）
     */
    private String delta;

    /**
     * 事件ID
     */
    @JsonProperty("event_id")
    private String eventId;

    /**
     * 响应ID（用于 response.* 事件）
     */
    @JsonProperty("response_id")
    private String responseId;

    /**
     * 项目ID（用于 conversation.item.* 事件）
     */
    @JsonProperty("item_id")
    private String itemId;

    /**
     * 输出索引（用于 response.* 事件）
     */
    @JsonProperty("output_index")
    private Integer outputIndex;

    /**
     * 内容索引（用于 response.* 事件）
     */
    @JsonProperty("content_index")
    private Integer contentIndex;

    /**
     * 错误信息（用于 error 事件）
     */
    private ErrorDetail error;

    /**
     * 错误详情
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ErrorDetail {
        private String type;
        private String code;
        private String message;
        private String param;
    }

    // 静态工厂方法

    public static OpenAIRealtimeMessage inputAudioBufferAppend(String audio) {
        return OpenAIRealtimeMessage.builder()
                .type("input_audio_buffer.append")
                .audio(audio)
                .build();
    }

    public static OpenAIRealtimeMessage inputAudioBufferCommit() {
        return OpenAIRealtimeMessage.builder()
                .type("input_audio_buffer.commit")
                .build();
    }

    public static OpenAIRealtimeMessage conversationItemInputAudioTranscriptionCompleted(
            String itemId, String transcript) {
        return OpenAIRealtimeMessage.builder()
                .type("conversation.item.input_audio_transcription.completed")
                .itemId(itemId)
                .transcript(transcript)
                .build();
    }

    public static OpenAIRealtimeMessage responseAudioDelta(
            String responseId, Integer outputIndex, Integer contentIndex, String delta) {
        return OpenAIRealtimeMessage.builder()
                .type("response.audio.delta")
                .responseId(responseId)
                .outputIndex(outputIndex)
                .contentIndex(contentIndex)
                .delta(delta)
                .build();
    }

    public static OpenAIRealtimeMessage responseAudioTranscriptDelta(
            String responseId, Integer outputIndex, Integer contentIndex, String delta) {
        return OpenAIRealtimeMessage.builder()
                .type("response.audio_transcript.delta")
                .responseId(responseId)
                .outputIndex(outputIndex)
                .contentIndex(contentIndex)
                .delta(delta)
                .build();
    }

    public static OpenAIRealtimeMessage responseTextDelta(
            String responseId, Integer outputIndex, Integer contentIndex, String delta) {
        return OpenAIRealtimeMessage.builder()
                .type("response.text.delta")
                .responseId(responseId)
                .outputIndex(outputIndex)
                .contentIndex(contentIndex)
                .delta(delta)
                .build();
    }

    public static OpenAIRealtimeMessage responseDone(String responseId) {
        return OpenAIRealtimeMessage.builder()
                .type("response.done")
                .responseId(responseId)
                .build();
    }

    public static OpenAIRealtimeMessage error(String code, String message) {
        return OpenAIRealtimeMessage.builder()
                .type("error")
                .error(ErrorDetail.builder()
                        .code(code)
                        .message(message)
                        .build())
                .build();
    }
}
