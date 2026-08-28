package com.kuakua.mirror.shared.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 健康检查控制器
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "timestamp", LocalDateTime.now(),
                "service", "kuakua-mirror"
        ));
    }

    @GetMapping("/version")
    public ResponseEntity<Map<String, Object>> version() {
        return ResponseEntity.ok(Map.of(
                "version", "1.0.0",
                "name", "KuaKua Mirror Backend"
        ));
    }
}
