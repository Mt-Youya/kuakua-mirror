package com.kuakua.mirror.ai.infra;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * OpenAI API 服务
 * 处理 ASR (Whisper), LLM (GPT-4), TTS 调用
 */
@Slf4j
@Service
public class OpenAIService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${openai.api-key}")
    private String apiKey;

    public OpenAIService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder
                .baseUrl("https://api.openai.com/v1")
                .build();
        this.objectMapper = objectMapper;
    }

    /**
     * ASR: 将音频转换为文本 (Whisper API)
     * @param audioData PCM16 音频数据 (Base64编码)
     * @return 识别的文本
     */
    public Mono<String> transcribeAudio(byte[] audioData) {
        log.debug("调用 Whisper API，音频数据大小: {} bytes", audioData.length);

        // 构建 multipart/form-data 请求
        return webClient.post()
                .uri("/audio/transcriptions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .bodyValue(Map.of(
                        "file", audioData,
                        "model", "whisper-1",
                        "language", "zh",
                        "response_format", "json"
                ))
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(json -> json.get("text").asText())
                .doOnSuccess(text -> log.info("ASR 成功: {}", text))
                .doOnError(e -> log.error("ASR 失败", e));
    }

    /**
     * LLM: 生成对话回复 (GPT-4 API)
     * @param userMessage 用户消息
     * @param systemPrompt 系统提示词
     * @return AI 回复
     */
    public Mono<String> generateResponse(String userMessage, String systemPrompt) {
        log.debug("调用 GPT-4 API，用户消息: {}", userMessage);

        var requestBody = Map.of(
                "model", "gpt-4o",
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userMessage)
                ),
                "temperature", 0.8,
                "max_tokens", 300
        );

        return webClient.post()
                .uri("/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(json -> json.get("choices").get(0).get("message").get("content").asText())
                .doOnSuccess(response -> log.info("LLM 成功，回复长度: {}", response.length()))
                .doOnError(e -> log.error("LLM 失败", e));
    }

    /**
     * LLM: 流式生成对话回复 (GPT-4 Streaming)
     * @param messages 消息列表（包含系统提示和历史对话）
     * @return AI 回复流
     */
    public Flux<String> chatCompletionStream(List<Map<String, String>> messages) {
        log.debug("调用 GPT-4 Streaming API，消息数: {}", messages.size());

        var requestBody = Map.of(
                "model", "gpt-4o",
                "messages", messages,
                "temperature", 0.8,
                "max_tokens", 300,
                "stream", true
        );

        return webClient.post()
                .uri("/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToFlux(String.class)
                .filter(line -> line.startsWith("data: ") && !line.contains("[DONE]"))
                .map(line -> line.substring(6))
                .flatMap(json -> {
                    try {
                        JsonNode node = objectMapper.readTree(json);
                        String delta = node.get("choices").get(0).get("delta").get("content").asText("");
                        return Mono.just(delta);
                    } catch (Exception e) {
                        return Mono.empty();
                    }
                })
                .doOnError(e -> log.error("LLM Streaming 失败", e));
    }

    /**
     * LLM: 流式生成对话回复 (GPT-4 Streaming) - 兼容旧方法
     * @param userMessage 用户消息
     * @param systemPrompt 系统提示词
     * @return AI 回复流
     */
    public Flux<String> generateResponseStream(String userMessage, String systemPrompt) {
        log.debug("调用 GPT-4 Streaming API，用户消息: {}", userMessage);

        var requestBody = Map.of(
                "model", "gpt-4o",
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userMessage)
                ),
                "temperature", 0.8,
                "max_tokens", 300,
                "stream", true
        );

        return webClient.post()
                .uri("/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToFlux(String.class)
                .filter(line -> line.startsWith("data: ") && !line.contains("[DONE]"))
                .map(line -> line.substring(6))
                .flatMap(json -> {
                    try {
                        JsonNode node = objectMapper.readTree(json);
                        String delta = node.get("choices").get(0).get("delta").get("content").asText("");
                        return Mono.just(delta);
                    } catch (Exception e) {
                        return Mono.empty();
                    }
                })
                .doOnError(e -> log.error("LLM Streaming 失败", e));
    }

    /**
     * TTS: 将文本转换为语音 (TTS API)
     * @param text 要转换的文本
     * @return 音频数据 (PCM16 格式)
     */
    public Mono<byte[]> synthesizeSpeech(String text) {
        log.debug("调用 TTS API，文本: {}", text);

        var requestBody = Map.of(
                "model", "tts-1",
                "input", text,
                "voice", "nova",  // 可选: alloy, echo, fable, onyx, nova, shimmer
                "response_format", "pcm"
        );

        return webClient.post()
                .uri("/audio/speech")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(byte[].class)
                .doOnSuccess(audio -> log.info("TTS 成功，音频大小: {} bytes", audio.length))
                .doOnError(e -> log.error("TTS 失败", e));
    }

    /**
     * 分析情绪
     * @param text 文本
     * @return 情绪标签 (happy, sad, neutral, excited, etc.)
     */
    public Mono<String> analyzeEmotion(String text) {
        var systemPrompt = "你是一个情绪分析专家。分析用户的文本，返回一个情绪标签。" +
                "只返回以下之一: happy, sad, neutral, excited, anxious, angry, confused";

        var requestBody = Map.of(
                "model", "gpt-4o-mini",
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", text)
                ),
                "temperature", 0.3,
                "max_tokens", 10
        );

        return webClient.post()
                .uri("/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(json -> json.get("choices").get(0).get("message").get("content").asText().trim().toLowerCase())
                .onErrorReturn("neutral");
    }
}
