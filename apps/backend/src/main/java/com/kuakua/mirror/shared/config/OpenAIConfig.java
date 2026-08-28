package com.kuakua.mirror.shared.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAI API 配置
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "openai")
public class OpenAIConfig {

    /**
     * OpenAI API Key
     */
    private String apiKey;

    /**
     * OpenAI API Base URL
     */
    private String apiBase = "https://api.openai.com";

    /**
     * 模型配置
     */
    private ModelConfig model = new ModelConfig();

    @Data
    public static class ModelConfig {
        /**
         * ASR 模型
         */
        private String asr = "whisper-1";

        /**
         * LLM 模型
         */
        private String llm = "gpt-4o-realtime-preview";

        /**
         * TTS 模型
         */
        private String tts = "tts-1";
    }
}
