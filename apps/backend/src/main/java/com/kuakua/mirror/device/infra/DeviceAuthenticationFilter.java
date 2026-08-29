package com.kuakua.mirror.device.infra;

import com.kuakua.mirror.device.domain.Device;
import com.kuakua.mirror.shared.exception.BusinessException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class DeviceAuthenticationFilter extends OncePerRequestFilter {

    private final DeviceService deviceService;

    @Override
    protected boolean shouldNotFilterAsyncDispatch() {
        return false;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.equals("/api/health") || path.equals("/api/version")
                || (path.equals("/api/v1/devices/activate") && request.getMethod().equals("POST"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        boolean streamRequest = request.getRequestURI().equals("/api/v1/praise/stream")
                || request.getRequestURI().equals("/api/v1/chat/stream");
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            String token = authorization.substring(7);
            try {
                Device device = deviceService.verifyDeviceToken(token);
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                        device, null, List.of(new SimpleGrantedAuthority("ROLE_DEVICE"))));
                if (streamRequest) {
                    log.info("device-auth result=accepted method={} path={} token_fingerprint={}",
                            request.getMethod(), request.getRequestURI(), tokenFingerprint(token));
                }
            } catch (BusinessException ignored) {
                SecurityContextHolder.clearContext();
                if (streamRequest) {
                    log.warn("device-auth result=rejected method={} path={} token_fingerprint={}",
                            request.getMethod(), request.getRequestURI(), tokenFingerprint(token));
                }
            }
        } else if (streamRequest) {
            log.warn("device-auth result=missing-bearer method={} path={} authorization_present={}",
                    request.getMethod(), request.getRequestURI(), authorization != null);
        }
        filterChain.doFilter(request, response);
    }

    private String tokenFingerprint(String token) {
        int hash = 0x811c9dc5;
        for (int index = 0; index < token.length(); index++) hash = (hash ^ token.charAt(index)) * 0x01000193;
        return String.format("%08x", hash);
    }
}
