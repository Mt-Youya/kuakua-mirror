package com.kuakua.mirror.ai.infra;

import com.alibaba.dashscope.aigc.generation.Generation;
import com.alibaba.dashscope.aigc.generation.GenerationParam;
import com.alibaba.dashscope.aigc.generation.GenerationResult;
import com.alibaba.dashscope.aigc.multimodalconversation.MultiModalConversation;
import com.alibaba.dashscope.aigc.multimodalconversation.MultiModalConversationParam;
import com.alibaba.dashscope.aigc.multimodalconversation.MultiModalConversationResult;
import com.alibaba.dashscope.audio.asr.recognition.Recognition;
import com.alibaba.dashscope.audio.asr.recognition.RecognitionParam;
import com.alibaba.dashscope.audio.http_tts.HttpSpeechSynthesisParam;
import com.alibaba.dashscope.audio.http_tts.HttpSpeechSynthesizer;
import com.alibaba.dashscope.common.Message;
import com.alibaba.dashscope.common.MultiModalMessage;
import com.alibaba.dashscope.utils.Constants;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.File;
import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@Service
public class DashScopeService {

    @Value("${dashscope.api-key:}")
    private String apiKey;

    @Value("${dashscope.base-url:}")
    private String baseUrl;

    @Value("${dashscope.websocket-url:}")
    private String websocketUrl;

    @Value("${dashscope.model.vision:qwen3-vl-plus}")
    private String visionModel;

    @Value("${dashscope.model.text:qwen-plus}")
    private String textModel;

    @Value("${dashscope.model.asr:qwen-audio-3.0-asr-flash-streaming}")
    private String asrModel;

    @Value("${dashscope.model.tts:qwen-audio-3.0-tts-flash}")
    private String ttsModel;

    @Value("${dashscope.tts-voice:}")
    private String ttsVoice;

    @PostConstruct
    void configureEndpoint() {
        if (!baseUrl.isBlank()) {
            Constants.baseHttpApiUrl = baseUrl;
        }
        if (!websocketUrl.isBlank()) {
            Constants.baseWebsocketApiUrl = websocketUrl;
        }
    }

    public Flux<String> streamImagePraise(String imageDataUrl) {
        return streamImageResponse(imageDataUrl, "请用温暖、具体且不超过十五个汉字的语气夸奖照片中的人。");
    }

    public Mono<String> generateImageResponse(String imageDataUrl, String prompt) {
        return streamImageResponse(imageDataUrl, prompt)
                .collectList()
                .map(parts -> String.join("", parts));
    }

    private Flux<String> streamImageResponse(String imageDataUrl, String prompt) {
        return Flux.defer(() -> {
            MultiModalMessage message = MultiModalMessage.builder()
                    .role("user")
                    .content(List.of(
                            Map.of("image", imageDataUrl),
                            Map.of("text", prompt)
                    ))
                    .build();
            MultiModalConversationParam param = MultiModalConversationParam.builder()
                    .apiKey(requireApiKey())
                    .model(visionModel)
                    .message(message)
                    .incrementalOutput(true)
                    .build();
            try {
                return Flux.from(new MultiModalConversation().streamCall(param))
                        .map(this::multiModalText)
                        .filter(text -> !text.isBlank());
            } catch (Exception exception) {
                return Flux.error(exception);
            }
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Flux<String> streamText(List<Message> messages) {
        return Flux.defer(() -> {
            GenerationParam param = GenerationParam.builder()
                    .apiKey(requireApiKey())
                    .model(textModel)
                    .messages(messages)
                    .incrementalOutput(true)
                    .build();
            try {
                return Flux.from(new Generation().streamCall(param))
                        .map(this::text)
                        .filter(text -> !text.isBlank());
            } catch (Exception exception) {
                return Flux.error(exception);
            }
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<String> generateResponse(String userMessage, String systemPrompt) {
        return streamText(List.of(
                Message.builder().role("system").content(systemPrompt).build(),
                Message.builder().role("user").content(userMessage).build()
        )).collectList().map(parts -> String.join("", parts));
    }

    public Mono<String> transcribe(byte[] wav) {
        return Mono.fromCallable(() -> {
            Path temporaryAudio = Files.createTempFile("kuakua-asr-", ".wav");
            try {
                Files.write(temporaryAudio, wav);
                RecognitionParam param = RecognitionParam.builder()
                        .apiKey(requireApiKey())
                        .model(asrModel)
                        .format("wav")
                        .sampleRate(16000)
                        .build();
                return new Recognition().call(param, temporaryAudio.toFile());
            } finally {
                Files.deleteIfExists(temporaryAudio);
            }
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<byte[]> synthesize(String text) {
        return Mono.fromCallable(() -> {
            if (ttsVoice.isBlank()) {
                throw new IllegalStateException("DASHSCOPE_TTS_VOICE is not configured");
            }
            HttpSpeechSynthesisParam param = HttpSpeechSynthesisParam.builder()
                    .apiKey(requireApiKey())
                    .model(ttsModel)
                    .text(text)
                    .voice(ttsVoice)
                    .format("wav")
                    .sampleRate(16000)
                    .build();
            ByteBuffer buffer = new HttpSpeechSynthesizer().callAndReturnAudio(param);
            byte[] audio = new byte[buffer.remaining()];
            buffer.get(audio);
            return audio;
        }).subscribeOn(Schedulers.boundedElastic());
    }

    private String requireApiKey() {
        if (apiKey.isBlank()) {
            throw new IllegalStateException("DASHSCOPE_API_KEY is not configured");
        }
        return apiKey;
    }

    private String text(GenerationResult result) {
        if (result.getOutput() == null) {
            return "";
        }
        if (result.getOutput().getText() != null) {
            return result.getOutput().getText();
        }
        return result.getOutput().getChoices().isEmpty()
                ? ""
                : result.getOutput().getChoices().getFirst().getMessage().getContent();
    }

    private String multiModalText(MultiModalConversationResult result) {
        if (result.getOutput() == null || result.getOutput().getChoices().isEmpty()) {
            return "";
        }
        return result.getOutput().getChoices().getFirst().getMessage().getContent().stream()
                .map(content -> content.get("text"))
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .findFirst()
                .orElse("");
    }
}
