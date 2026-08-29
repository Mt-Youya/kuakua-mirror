package com.kuakua.mirror.k10;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class K10RequestSizeFilter extends OncePerRequestFilter {

    public static final long MAX_REQUEST_BODY_BYTES = 1_500_000;
    private static final Set<String> PROTECTED_PATHS = Set.of(
            "/api/v1/praise/stream", "/api/v1/chat/stream", "/api/v1/tts"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return !"POST".equals(request.getMethod()) || !PROTECTED_PATHS.contains(path);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        long contentLength = request.getContentLengthLong();
        if (contentLength < 0) {
            response.sendError(HttpStatus.LENGTH_REQUIRED.value(), "必须提供 Content-Length");
            return;
        }
        if (contentLength > MAX_REQUEST_BODY_BYTES) {
            response.sendError(HttpStatus.PAYLOAD_TOO_LARGE.value(), "请求体超过 1500000 字节");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
