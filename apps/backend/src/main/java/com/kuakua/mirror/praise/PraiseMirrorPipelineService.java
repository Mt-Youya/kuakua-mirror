package com.kuakua.mirror.praise;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kuakua.mirror.ai.infra.DashScopeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * 夸夸镜完整管线服务
 * 实现三阶段：P1视觉标签 → P_voice对话洞察 → P2融合夸夸
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PraiseMirrorPipelineService {

    private final PraiseMirrorPromptService promptService;
    private final DashScopeService dashScopeService;
    private final ObjectMapper objectMapper;

    /**
     * 完整管线：从照片和对话生成夸夸句
     *
     * @param imageBase64 用户照片（base64）
     * @param recentDialogue 近期对话文本（可选）
     * @return 夸夸句及元数据
     */
    public Mono<PraiseResult> generatePraise(String imageBase64, String recentDialogue) {
        return Mono.fromCallable(() -> {
            // P1 和 P_voice 并行执行
            CompletableFuture<JsonNode> p1Future = CompletableFuture.supplyAsync(() ->
                runP1Vision(imageBase64)
            );

            CompletableFuture<JsonNode> pVoiceFuture = CompletableFuture.supplyAsync(() ->
                runPVoice(recentDialogue)
            );

            // 等待并行结果
            JsonNode visualTags = p1Future.join();
            JsonNode voiceInsights = pVoiceFuture.join();

            log.info("P1 视觉标签: {}", visualTags);
            log.info("P_voice 对话洞察: {}", voiceInsights);

            // P2 融合夸夸（最多重试2次）
            String praiseSentence = null;
            int retryCount = 0;
            boolean passedValidation = false;

            String p2Prompt = promptService.getP2PraisePrompt(visualTags, voiceInsights, recentDialogue);

            for (int i = 0; i < 3; i++) {
                praiseSentence = runP2Praise(p2Prompt);

                // 验证输出
                List<String> errors = promptService.validatePraise(praiseSentence);
                if (errors.isEmpty()) {
                    passedValidation = true;
                    break;
                }

                log.warn("夸夸句未通过验证（第 {} 次）: {} - {}", i + 1, praiseSentence, errors);
                retryCount = i + 1;

                if (i < 2) {
                    // 构建重跑指令
                    String retryInstruction = promptService.buildRetryInstruction(praiseSentence, errors);
                    p2Prompt = p2Prompt + retryInstruction;
                }
            }

            // 如果3次都不过，使用兜底句
            boolean isFallback = false;
            if (!passedValidation) {
                praiseSentence = promptService.getFallbackPraise();
                isFallback = true;
                log.warn("使用兜底句: {}", praiseSentence);
            }

            return PraiseResult.builder()
                .praiseSentence(praiseSentence)
                .visualTags(visualTags)
                .voiceInsights(voiceInsights)
                .passedValidation(passedValidation)
                .retryCount(retryCount)
                .isFallback(isFallback)
                .build();
        });
    }

    /**
     * P1 视觉标签提取
     */
    private JsonNode runP1Vision(String imageBase64) {
        try {
            String prompt = promptService.getP1VisualPrompt();
            String response = dashScopeService.generateImageResponse(
                    "data:image/jpeg;base64," + imageBase64, prompt).block();
            if (response == null || response.isBlank()) {
                throw new IllegalStateException("P1 视觉模型未返回标签");
            }
            return objectMapper.readTree(stripCodeFence(response));
        } catch (Exception e) {
            log.error("P1 视觉标签提取失败", e);
            return objectMapper.createObjectNode()
                .put("blurry", true)
                .set("expression", objectMapper.createArrayNode().add("无法辨认"));
        }
    }

    private String stripCodeFence(String response) {
        String value = response.trim();
        if (!value.startsWith("```")) {
            return value;
        }
        int firstNewline = value.indexOf('\n');
        int lastFence = value.lastIndexOf("```");
        return firstNewline >= 0 && lastFence > firstNewline
                ? value.substring(firstNewline + 1, lastFence).trim()
                : value;
    }

    /**
     * P_voice 对话洞察
     */
    private JsonNode runPVoice(String recentDialogue) {
        try {
            String prompt = promptService.getPVoicePrompt(recentDialogue);
            if (prompt == null) {
                return null; // 对话太短，跳过
            }

            String response = dashScopeService.generateResponse(recentDialogue, prompt).block();
            return objectMapper.readTree(response);
        } catch (Exception e) {
            log.error("P_voice 对话洞察失败", e);
            return null;
        }
    }

    /**
     * P2 融合夸夸
     */
    private String runP2Praise(String prompt) {
        try {
            String response = dashScopeService.generateResponse("", prompt).block();
            // 清理可能的 JSON 格式或引号
            return response
                .replaceAll("^[\"']|[\"']$", "")
                .replaceAll("\\\\n", "")
                .trim();
        } catch (Exception e) {
            log.error("P2 融合夸夸失败", e);
            return promptService.getFallbackPraise();
        }
    }

    @lombok.Builder
    @lombok.Data
    public static class PraiseResult {
        private String praiseSentence;
        private JsonNode visualTags;
        private JsonNode voiceInsights;
        private Boolean passedValidation;
        private Integer retryCount;
        private Boolean isFallback;
    }
}
