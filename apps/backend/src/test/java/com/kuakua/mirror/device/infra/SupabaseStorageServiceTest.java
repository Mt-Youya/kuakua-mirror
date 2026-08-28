package com.kuakua.mirror.device.infra;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kuakua.mirror.shared.exception.BusinessException;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SupabaseStorageServiceTest {

    private HttpServer server;
    private final AtomicBoolean publicBucket = new AtomicBoolean();
    private SupabaseStorageService storage;

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/storage/v1/bucket", exchange -> {
            if ("POST".equals(exchange.getRequestMethod())) {
                respond(exchange, 409, "{}");
            } else {
                respond(exchange, 200, "{\"public\":" + publicBucket.get() + "}");
            }
        });
        server.createContext("/storage/v1/object", exchange -> respond(exchange, 200, "{}"));
        server.start();
        storage = new SupabaseStorageService(new ObjectMapper(), HttpClient.newHttpClient());
        ReflectionTestUtils.setField(storage, "url", "http://localhost:" + server.getAddress().getPort());
        ReflectionTestUtils.setField(storage, "serviceRoleKey", "test-key");
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    @Test
    void rejectsAnExistingPublicBucket() {
        publicBucket.set(true);

        assertThrows(BusinessException.class, () -> storage.upload("device-images", "d/a.jpg", "image/jpeg", new byte[]{1}));
    }

    @Test
    void acceptsAnExistingPrivateBucket() {
        assertDoesNotThrow(() -> storage.upload("device-images", "d/a.jpg", "image/jpeg", new byte[]{1}));
    }

    private void respond(com.sun.net.httpserver.HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes();
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
