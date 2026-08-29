package com.kuakua.mirror.test;

import com.kuakua.mirror.ai.infra.DashScopeService;
import com.kuakua.mirror.praise.PraiseMirrorPromptService;
import com.kuakua.mirror.praise.PraiseMirrorPipelineService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 测试端点 - 验证百炼 API 配置和 Skill 加载
 * 不需要设备认证，可以直接访问
 */
@RestController
@RequiredArgsConstructor
@Profile("!prod")  // 仅在非生产环境启用
public class TestController {

    private final DashScopeService dashScopeService;
    private final PraiseMirrorPromptService promptService;
    private final PraiseMirrorPipelineService pipelineService;

    /**
     * 测试百炼 TTS
     * GET /api/test/tts?text=测试
     */
    @GetMapping("/api/test/tts")
    public Mono<Map<String, Object>> testTts(@RequestParam(defaultValue = "今天天气真好") String text) {
        return dashScopeService.synthesize(text)
                .map(audio -> {
                    Map<String, Object> result = new HashMap<>();
                    result.put("success", true);
                    result.put("message", "TTS 调用成功，百炼 API 工作正常");
                    result.put("audioSize", audio.length);
                    result.put("text", text);
                    return result;
                })
                .onErrorResume(e -> {
                    Map<String, Object> error = new HashMap<>();
                    error.put("success", false);
                    error.put("errorType", e.getClass().getSimpleName());
                    error.put("errorMessage", e.getMessage());
                    error.put("note", "TTS 模型或音色配置可能有问题，但这不影响文本模型的正常使用");
                    return Mono.just(error);
                });
    }

    /**
     * 测试百炼文本模型
     * GET /api/test/chat?message=你好
     */
    @GetMapping("/api/test/chat")
    public Mono<Map<String, Object>> testChat(@RequestParam(defaultValue = "用一句话介绍你自己") String message) {
        return dashScopeService.generateResponse(message, "你是一个友好的 AI 助手")
                .map(response -> {
                    Map<String, Object> result = new HashMap<>();
                    result.put("success", true);
                    result.put("message", "文本模型调用成功");
                    result.put("response", response);
                    return result;
                })
                .onErrorResume(e -> {
                    Map<String, Object> error = new HashMap<>();
                    error.put("success", false);
                    error.put("error", e.getMessage());
                    return Mono.just(error);
                });
    }

    /**
     * 查看 Skill 提示词是否加载成功
     * GET /api/test/skill/prompts?stage=p1
     */
    @GetMapping("/api/test/skill/prompts")
    public Mono<Map<String, Object>> getPrompt(@RequestParam String stage) {
        return Mono.fromCallable(() -> {
            Map<String, Object> result = new HashMap<>();

            switch (stage.toLowerCase()) {
                case "p1":
                    String p1 = promptService.getP1VisualPrompt();
                    result.put("success", !p1.isEmpty());
                    result.put("stage", "P1 视觉标签提取");
                    result.put("promptLength", p1.length());
                    result.put("promptPreview", p1.substring(0, Math.min(200, p1.length())) + "...");
                    break;

                case "p_voice":
                    String pVoice = promptService.getPVoicePrompt("示例对话文本，用于测试提示词加载");
                    result.put("success", pVoice != null && !pVoice.isEmpty());
                    result.put("stage", "P_voice 对话洞察");
                    result.put("promptLength", pVoice != null ? pVoice.length() : 0);
                    result.put("promptPreview", pVoice != null ?
                        pVoice.substring(0, Math.min(200, pVoice.length())) + "..." : "");
                    break;

                case "p2":
                    String p2 = promptService.getP2PraisePrompt(null, null, null);
                    result.put("success", !p2.isEmpty());
                    result.put("stage", "P2 融合夸夸");
                    result.put("promptLength", p2.length());
                    result.put("promptPreview", p2.substring(0, Math.min(200, p2.length())) + "...");
                    break;

                default:
                    result.put("success", false);
                    result.put("error", "Invalid stage. Use: p1, p_voice, or p2");
            }

            return result;
        });
    }

    /**
     * 测试夸夸句验证规则
     * POST /api/test/skill/validate
     */
    @PostMapping("/api/test/skill/validate")
    public Mono<Map<String, Object>> validatePraise(@RequestBody String praiseSentence) {
        return Mono.fromCallable(() -> {
            List<String> errors = promptService.validatePraise(praiseSentence);

            Map<String, Object> result = new HashMap<>();
            result.put("input", praiseSentence);
            result.put("passed", errors.isEmpty());
            result.put("errors", errors);
            result.put("errorCount", errors.size());

            return result;
        });
    }

    /**
     * 测试完整管线（仅文本，不含真实照片）
     * POST /api/test/skill/pipeline
     */
    @PostMapping("/api/test/skill/pipeline")
    public Mono<Map<String, Object>> testPipeline(@RequestBody Map<String, String> request) {
        String dialogue = request.getOrDefault("dialogue", "我今天心情很好");

        return pipelineService.generatePraise("mock_image_base64", dialogue)
                .map(result -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", true);
                    response.put("praiseSentence", result.getPraiseSentence());
                    response.put("passedValidation", result.getPassedValidation());
                    response.put("retryCount", result.getRetryCount());
                    response.put("isFallback", result.getIsFallback());
                    response.put("visualTags", result.getVisualTags());
                    response.put("voiceInsights", result.getVoiceInsights());
                    return response;
                })
                .onErrorResume(e -> {
                    Map<String, Object> error = new HashMap<>();
                    error.put("success", false);
                    error.put("error", e.getMessage());
                    return Mono.just(error);
                });
    }
}
