package com.kuakua.mirror.shared.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * WebClient 配置
 */
@Configuration
@RequiredArgsConstructor
public class WebClientConfig {

    private final OpenAIConfig openAIConfig;

    @Bean
    public WebClient openAIWebClient() {
        return WebClient.builder()
                .baseUrl(openAIConfig.getApiBase())
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + openAIConfig.getApiKey())
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024)) // 10MB
                .build();
    }
}
