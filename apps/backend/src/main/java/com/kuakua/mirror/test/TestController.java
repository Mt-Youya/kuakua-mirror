package com.kuakua.mirror.test;

import com.kuakua.mirror.ai.infra.DashScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * 测试端点 - 验证百炼 API 配置
 * 不需要设备认证，可以直接访问
 */
@RestController
@RequiredArgsConstructor
@Profile("!prod")  // 仅在非生产环境启用
public class TestController {

    private final DashScopeService dashScopeService;

    /**
     * 测试百炼 TTS
     * GET /api/test/tts?text=测试
     */
    @GetMapping("/api/test/tts")
    public Mono<Map<String, Object>> testTts(@RequestParam(defaultValue = "今天天气真好") String text) {
        return dashScopeService.synthesize(text)
                .map(audio -> {
                    Map<String, Object> result = new java.util.HashMap<>();
                    result.put("success", true);
                    result.put("message", "TTS 调用成功，百炼 API 工作正常");
                    result.put("audioSize", audio.length);
                    result.put("text", text);
                    return result;
                })
                .onErrorResume(e -> {
                    Map<String, Object> error = new java.util.HashMap<>();
                    error.put("success", false);
                    error.put("errorType", e.getClass().getSimpleName());
                    error.put("errorMessage", e.getMessage());
                    if (e.getCause() != null) {
                        error.put("cause", e.getCause().getMessage());
                    }
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
                    Map<String, Object> result = new java.util.HashMap<>();
                    result.put("success", true);
                    result.put("message", "文本模型调用成功");
                    result.put("response", response);
                    return result;
                })
                .onErrorResume(e -> {
                    Map<String, Object> error = new java.util.HashMap<>();
                    error.put("success", false);
                    error.put("error", e.getMessage());
                    return Mono.just(error);
                });
    }
}
