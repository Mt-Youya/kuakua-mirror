package com.kuakua.mirror.controller;

import com.kuakua.mirror.shared.controller.HealthController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.test.web.reactive.server.WebTestClient;

@WebFluxTest(HealthController.class)
class HealthControllerTest {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    void testHealth() {
        webTestClient.get()
                .uri("/api/health")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.status").isEqualTo("UP")
                .jsonPath("$.service").isEqualTo("kuakua-mirror")
                .jsonPath("$.timestamp").exists();
    }

    @Test
    void testVersion() {
        webTestClient.get()
                .uri("/api/version")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.version").isEqualTo("1.0.0")
                .jsonPath("$.name").isEqualTo("KuaKua Mirror Backend");
    }
}
