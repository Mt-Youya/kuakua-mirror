package com.kuakua.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kuakua.dto.PraiseMirrorRequest;
import com.kuakua.dto.PraiseMirrorResponse;
import com.kuakua.service.LLMClientService;
import com.kuakua.service.PraiseMirrorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * 夸夸镜 API 控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/praise-mirror")
@RequiredArgsConstructor
public class PraiseMirrorController {

    private final PraiseMirrorService praiseMirrorService;
    private final LLMClientService llmClient;
    private final ObjectMapper objectMapper;

    /**
     * 主入口：完整管线
     */
    @PostMapping("/generate")
    public ResponseEntity<PraiseMirrorResponse> generate(@RequestBody PraiseMirrorRequest request) {
        long startTime = System.currentTimeMillis();

        try {
            // P1 视觉标签提取（qwen-vl-max）
            CompletableFuture<JsonNode> p1Future = CompletableFuture.supplyAsync(() -> {
                String p1Prompt = praiseMirrorService.getP1VisualTagsPrompt();
                return llmClient.callVisionModel(
                    "qwen-vl-max",
                    p1Prompt,
                    request.getImageData(),
                    0.7,
                    300
                );
            });

            // P_voice 对话洞察（qwen-max，可选）
            CompletableFuture<JsonNode> pVoiceFuture = CompletableFuture.supplyAsync(() -> {
                String pVoicePrompt = praiseMirrorService.getPVoiceInsightsPrompt(request.getDialogueText());
                if (pVoicePrompt == null) {
                    return null;
                }
                return llmClient.callTextModel(
                    "qwen-max",
                    pVoicePrompt,
                    request.getDialogueText(),
                    0.5,
                    300
                );
            });

            // 等待 P1 和 P_voice 完成（并行执行）
            JsonNode visualTags = p1Future.join();
            JsonNode voiceInsights = pVoiceFuture.join();

            // P2 融合夸夸（qwen-max）
            String p2Prompt = praiseMirrorService.getP2PraisePrompt(
                visualTags,
                voiceInsights,
                request.getDialogueText()
            );

            String praiseSentence = null;
            int retryCount = 0;
            boolean passedValidation = false;

            // 最多重跑 2 次
            for (int i = 0; i < 3; i++) {
                praiseSentence = llmClient.callTextModel(
                    "qwen-max",
                    p2Prompt,
                    null,
                    0.95,
                    40
                ).asText();

                // 输出闸门验证
                List<String> errors = praiseMirrorService.validatePraise(praiseSentence);
                if (errors.isEmpty()) {
                    passedValidation = true;
                    break;
                }

                log.warn("夸夸句未通过验证（第 {} 次）: {} - {}", i + 1, praiseSentence, errors);
                retryCount = i + 1;

                if (i < 2) {
                    // 构建重跑指令
                    String retryInstruction = praiseMirrorService.buildRetryInstruction(praiseSentence, errors);
                    p2Prompt = p2Prompt + "\n\n" + retryInstruction;
                }
            }

            // 如果 3 次都不过，使用兜底句
            boolean isFallback = false;
            if (!passedValidation) {
                praiseSentence = praiseMirrorService.getFallbackPraise();
                isFallback = true;
                log.warn("使用兜底句: {}", praiseSentence);
            }

            // TTS 语音合成（qwen3-tts-flash）
            String audioUrl = llmClient.callTTS(
                "qwen3-tts-flash",
                praiseSentence,
                "Cherry"  // 女声
            );

            long processingTime = System.currentTimeMillis() - startTime;

            return ResponseEntity.ok(PraiseMirrorResponse.builder()
                .praiseSentence(praiseSentence)
                .audioUrl(audioUrl)
                .visualTags(visualTags)
                .voiceInsights(voiceInsights)
                .passedValidation(passedValidation)
                .retryCount(retryCount)
                .processingTimeMs(processingTime)
                .isFallback(isFallback)
                .build());

        } catch (Exception e) {
            log.error("夸夸镜管线执行失败", e);
            return ResponseEntity.status(500).body(
                PraiseMirrorResponse.builder()
                    .praiseSentence(praiseMirrorService.getFallbackPraise())
                    .isFallback(true)
                    .build()
            );
        }
    }

    /**
     * 获取指定阶段的提示词（调试用）
     */
    @GetMapping("/prompts/{stage}")
    public ResponseEntity<String> getPrompt(@PathVariable String stage) {
        return switch (stage.toLowerCase()) {
            case "p1" -> ResponseEntity.ok(praiseMirrorService.getP1VisualTagsPrompt());
            case "p_voice" -> ResponseEntity.ok(praiseMirrorService.getPVoiceInsightsPrompt("示例对话"));
            case "p2" -> {
                try {
                    JsonNode emptyTags = objectMapper.createObjectNode();
                    yield ResponseEntity.ok(praiseMirrorService.getP2PraisePrompt(emptyTags, null, null));
                } catch (Exception e) {
                    yield ResponseEntity.status(500).body("Error: " + e.getMessage());
                }
            }
            default -> ResponseEntity.badRequest().body("Invalid stage. Use: p1, p_voice, or p2");
        };
    }

    /**
     * 验证夸夸句质量（调试用）
     */
    @PostMapping("/validate")
    public ResponseEntity<?> validate(@RequestBody String praiseSentence) {
        List<String> errors = praiseMirrorService.validatePraise(praiseSentence);
        return ResponseEntity.ok(new ValidationResult(
            errors.isEmpty(),
            errors
        ));
    }

    private record ValidationResult(boolean passed, List<String> errors) {}
}
