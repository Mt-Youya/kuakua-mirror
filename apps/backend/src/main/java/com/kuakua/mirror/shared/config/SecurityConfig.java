package com.kuakua.mirror.shared.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kuakua.mirror.device.infra.DeviceAuthenticationFilter;
import com.kuakua.mirror.shared.dto.ApiResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final DeviceAuthenticationFilter deviceAuthenticationFilter;
    private final ObjectMapper objectMapper;

    public SecurityConfig(DeviceAuthenticationFilter deviceAuthenticationFilter, ObjectMapper objectMapper) {
        this.deviceAuthenticationFilter = deviceAuthenticationFilter;
        this.objectMapper = objectMapper;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .httpBasic(httpBasic -> httpBasic.disable())
            .formLogin(formLogin -> formLogin.disable())
            .exceptionHandling(exception -> exception.authenticationEntryPoint((request, response, ignored) -> {
                response.setStatus(401);
                response.setContentType("application/json;charset=UTF-8");
                objectMapper.writeValue(response.getOutputStream(), ApiResponse.error("设备Token无效"));
            }))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/health", "/api/version", "/api/v1/devices/activate", "/openapi.json").permitAll()
                .requestMatchers("/api/conversations/**", "/api/monitor/**").denyAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(deviceAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
