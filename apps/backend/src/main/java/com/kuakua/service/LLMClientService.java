package com.kuakua.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 大模型客户端服务
 * 封装对阿里云百炼平台（或兼容 OpenAI API）的调用
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LLMClientService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${llm.api.base-url:https://dashscope.aliyuncs.com/compatible-mode/v1}")
    private String apiBaseUrl;

    @Value("${llm.api.key}")
    private String apiKey;

    /**
     * 调用视觉模型（qwen-vl-max）
     */
    public JsonNode callVisionModel(String model, String systemPrompt, String imageData,
                                     double temperature, int maxTokens) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("model", model);
            request.put("temperature", temperature);
            request.put("max_tokens", maxTokens);

            // 构建消息
            Map<String, Object> systemMsg = Map.of(
                "role", "system",
                "content", systemPrompt
            );

            Map<String, Object> userMsg = Map.of(
                "role", "user",
                "content", List.of(
                    Map.of("type", "image_url", "image_url", Map.of("url", imageData))
                )
            );

            request.put("messages", List.of(systemMsg, userMsg));

            String response = callAPI("/chat/completions", request);
            JsonNode root = objectMapper.readTree(response);

            // 提取 assistant 回复（应该是 JSON 格式的标签）
            String content = root.at("/choices/0/message/content").asText();
            return objectMapper.readTree(content);

        } catch (Exception e) {
            log.error("调用视觉模型失败", e);
            // 返回兜底标签
            return objectMapper.createObjectNode()
                .put("blurry", true)
                .set("expression", objectMapper.createArrayNode().add("无法辨认"));
        }
    }

    /**
     * 调用文本模型（qwen-max）
     */
    public JsonNode callTextModel(String model, String systemPrompt, String userInput,
                                   double temperature, int maxTokens) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("model", model);
            request.put("temperature", temperature);
            request.put("max_tokens", maxTokens);

            // 构建消息
            var messages = new java.util.ArrayList<>();
            messages.add(Map.of("role", "system", "content", systemPrompt));

            if (userInput != null && !userInput.isEmpty()) {
                messages.add(Map.of("role", "user", "content", userInput));
            }

            request.put("messages", messages);

            String response = callAPI("/chat/completions", request);
            JsonNode root = objectMapper.readTree(response);

            String content = root.at("/choices/0/message/content").asText();

            // 尝试解析为 JSON，如果失败则返回文本节点
            try {
                return objectMapper.readTree(content);
            } catch (Exception e) {
                return objectMapper.getNodeFactory().textNode(content);
            }

        } catch (Exception e) {
            log.error("调用文本模型失败", e);
            return objectMapper.getNodeFactory().textNode("");
        }
    }

    /**
     * 调用 TTS 服务（qwen3-tts-flash）
     */
    public String callTTS(String model, String text, String voice) {
        try {
            Map<String, Object> request = Map.of(
                "model", model,
                "input", text,
                "voice", voice,
                "speed", 1.0,
                "format", "mp3"
            );

            String response = callAPI("/audio/speech", request);
            JsonNode root = objectMapper.readTree(response);

            // 返回音频文件 URL 或 base64
            return root.at("/url").asText();

        } catch (Exception e) {
            log.error("调用 TTS 失败", e);
            return null;
        }
    }

    /**
     * 底层 API 调用
     */
    private String callAPI(String endpoint, Map<String, Object> requestBody) {
        String url = apiBaseUrl + endpoint;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        return restTemplate.postForObject(url, entity, String.class);
    }
}
