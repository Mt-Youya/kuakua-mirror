package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.ai.infra.realtime.OpenAIRealtimeMessage;
import com.kuakua.mirror.device.dto.DeviceMessage;
import org.springframework.stereotype.Service;

/**
 * 设备协议适配器
 *
 * 负责硬件简化协议与 OpenAI Realtime API 格式的双向转换
 */
@Service
public class DeviceProtocolAdapter {

    /**
     * 将设备消息转换为 OpenAI Realtime API 消息
     *
     * @param deviceMsg 设备消息
     * @return OpenAI 消息，如果消息类型不需要转发给 OpenAI 则返回 null
     */
    public OpenAIRealtimeMessage translateToOpenAI(DeviceMessage deviceMsg) {
        if (deviceMsg == null || deviceMsg.getType() == null) {
            return null;
        }

        return switch (deviceMsg.getType()) {
            case "audio" -> {
                // 音频数据 -> input_audio_buffer.append
                if (deviceMsg.getData() == null) {
                    yield null;
                }
                yield OpenAIRealtimeMessage.inputAudioBufferAppend(deviceMsg.getData());
            }

            case "audio_end" -> {
                // 音频结束 -> input_audio_buffer.commit
                yield OpenAIRealtimeMessage.inputAudioBufferCommit();
            }

            case "text" -> {
                // 文本输入（MVP 阶段可能不支持，预留）
                // 需要时可以转换为 conversation.item.create
                yield null;
            }

            case "heartbeat", "device_info" -> {
                // 心跳和设备信息不需要转发给 OpenAI
                yield null;
            }

            default -> null;
        };
    }

    /**
     * 将 OpenAI Realtime API 消息转换为设备消息
     *
     * @param openAIMsg OpenAI 消息
     * @return 设备消息，如果消息类型不需要转发给设备则返回 null
     */
    public DeviceMessage translateFromOpenAI(OpenAIRealtimeMessage openAIMsg) {
        if (openAIMsg == null || openAIMsg.getType() == null) {
            return null;
        }

        return switch (openAIMsg.getType()) {
            case "conversation.item.input_audio_transcription.completed" -> {
                // 音频转写完成 -> transcript
                if (openAIMsg.getTranscript() == null) {
                    yield null;
                }
                yield DeviceMessage.transcript(openAIMsg.getTranscript());
            }

            case "response.audio.delta" -> {
                // 音频响应增量 -> audio_response
                if (openAIMsg.getDelta() == null) {
                    yield null;
                }
                yield DeviceMessage.audioResponse(openAIMsg.getDelta(), false);
            }

            case "response.audio.done" -> {
                // 音频响应完成 -> audio_response_end
                yield DeviceMessage.audioResponseEnd();
            }

            case "response.audio_transcript.delta" -> {
                // 音频转写文本增量 -> response_text（用于实时显示AI说话内容）
                if (openAIMsg.getDelta() == null) {
                    yield null;
                }
                yield DeviceMessage.responseText(openAIMsg.getDelta());
            }

            case "response.text.delta" -> {
                // 文本响应增量 -> response_text
                if (openAIMsg.getDelta() == null) {
                    yield null;
                }
                yield DeviceMessage.responseText(openAIMsg.getDelta());
            }

            case "response.done" -> {
                // 响应完成（可用于设备端状态管理，暂不转发）
                yield null;
            }

            case "error" -> {
                // 错误 -> error
                if (openAIMsg.getError() == null) {
                    yield DeviceMessage.error("UNKNOWN_ERROR", "未知错误");
                }
                String code = openAIMsg.getError().getCode() != null
                        ? openAIMsg.getError().getCode()
                        : "OPENAI_ERROR";
                String message = openAIMsg.getError().getMessage() != null
                        ? openAIMsg.getError().getMessage()
                        : "OpenAI API 错误";
                yield DeviceMessage.error(code, message);
            }

            case "session.created", "session.updated", "input_audio_buffer.speech_started",
                 "input_audio_buffer.speech_stopped", "input_audio_buffer.committed",
                 "conversation.item.created", "response.created", "response.output_item.added",
                 "response.output_item.done", "response.content_part.added",
                 "response.content_part.done", "rate_limits.updated" -> {
                // 这些事件是 OpenAI 的内部状态事件，不需要转发给设备
                yield null;
            }

            default -> null;
        };
    }
}
