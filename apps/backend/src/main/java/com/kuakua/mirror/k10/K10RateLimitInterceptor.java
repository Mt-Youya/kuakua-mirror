package com.kuakua.mirror.k10;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class K10RateLimitInterceptor implements HandlerInterceptor, WebMvcConfigurer {

    private static final int REQUESTS_PER_MINUTE = 10;
    private static final long WINDOW_MILLIS = 60_000;
    private final ConcurrentHashMap<String, RateWindow> windows = new ConcurrentHashMap<>();

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(this)
                .addPathPatterns("/api/praise/stream", "/api/chat/stream", "/api/tts");
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        if (request.getDispatcherType() != DispatcherType.REQUEST) {
            return true;
        }
        String deviceId = request.getHeader("X-Device-ID");
        if (deviceId == null || deviceId.isBlank() || tryAcquire(deviceId)) {
            return true;
        }
        response.setStatus(429);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"code\":429,\"message\":\"请求太频繁\",\"data\":null}");
        return false;
    }

    private boolean tryAcquire(String deviceId) {
        return windows.computeIfAbsent(deviceId, ignored -> new RateWindow()).tryAcquire();
    }

    private static final class RateWindow {
        private long startedAt = System.currentTimeMillis();
        private int requests;

        synchronized boolean tryAcquire() {
            long now = System.currentTimeMillis();
            if (now - startedAt >= WINDOW_MILLIS) {
                startedAt = now;
                requests = 0;
            }
            if (requests >= REQUESTS_PER_MINUTE) {
                return false;
            }
            requests++;
            return true;
        }
    }
}
