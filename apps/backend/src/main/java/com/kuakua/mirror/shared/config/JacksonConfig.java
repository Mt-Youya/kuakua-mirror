package com.kuakua.mirror.shared.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Jackson JSON 配置
 */
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();

        // 忽略未知属性
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        // 禁用将日期序列化为时间戳
        mapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);

        // 美化输出（开发环境）
        mapper.configure(SerializationFeature.INDENT_OUTPUT, true);

        return mapper;
    }
}
