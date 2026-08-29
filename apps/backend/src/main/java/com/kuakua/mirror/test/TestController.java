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
                .map(audio -> Map.of(
                        "success", true,
                        "message", "TTS 调用成功，百炼 API 工作正常",
                        "audioSize", audio.length,
                        "text", text
                ))
                .onErrorResume(e -> Mono.just(Map.of(
                        "success", false,
                        "error", e.getMessage(),
                        "hint", "检查 DASHSCOPE_API_KEY 和 DASHSCOPE_TTS_VOICE 环境变量"
                )));
    }

    /**
     * 测试百炼文本模型
     * GET /api/test/chat?message=你好
     */
    @GetMapping("/api/test/chat")
    public Mono<Map<String, Object>> testChat(@RequestParam(defaultValue = "用一句话介绍你自己") String message) {
        return dashScopeService.generateResponse(message, "你是一个友好的 AI 助手")
                .map(response -> Map.of(
                        "success", true,
                        "message", "文本模型调用成功",
                        "response", response
                ))
                .onErrorResume(e -> Mono.just(Map.of(
                        "success", false,
                        "error", e.getMessage()
                )));
    }
}
