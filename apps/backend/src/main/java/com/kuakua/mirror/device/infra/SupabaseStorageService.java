package com.kuakua.mirror.device.infra;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kuakua.mirror.shared.exception.BusinessException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SupabaseStorageService {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final Set<String> knownBuckets = ConcurrentHashMap.newKeySet();

    @Value("${supabase.url:}")
    private String url;

    @Value("${supabase.service-role-key:}")
    private String serviceRoleKey;

    @Autowired
    public SupabaseStorageService(ObjectMapper objectMapper) {
        this(objectMapper, HttpClient.newHttpClient());
    }

    SupabaseStorageService(ObjectMapper objectMapper, HttpClient httpClient) {
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
    }

    public void upload(String bucket, String path, String contentType, byte[] data) {
        ensurePrivateBucket(bucket);
        send(HttpRequest.newBuilder(objectUri("/storage/v1/object/" + bucket + "/" + path))
                .header("Content-Type", contentType)
                .header("x-upsert", "false")
                .PUT(HttpRequest.BodyPublishers.ofByteArray(data))
                .build());
    }

    public String signedDownloadUrl(String bucket, String path, int expiresInSeconds) {
        try {
            String body = objectMapper.writeValueAsString(java.util.Map.of("expiresIn", expiresInSeconds));
            HttpResponse<String> response = send(HttpRequest.newBuilder(objectUri("/storage/v1/object/sign/" + bucket + "/" + path))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build());
            JsonNode json = objectMapper.readTree(response.body());
            String signed = json.path("signedURL").asText(json.path("signedUrl").asText());
            if (signed.isBlank()) {
                throw unavailable();
            }
            return signed.startsWith("http") ? signed : url + signed;
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw unavailable();
        }
    }

    public void delete(String bucket, String path) {
        send(HttpRequest.newBuilder(objectUri("/storage/v1/object/" + bucket + "/" + path)).DELETE().build());
    }

    private HttpResponse<String> send(HttpRequest request) {
        if (url.isBlank() || serviceRoleKey.isBlank()) {
            throw unavailable();
        }
        try {
            HttpResponse<String> response = httpClient.send(authorize(request), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return response;
            }
        } catch (Exception ignored) {
        }
        throw unavailable();
    }

    private void ensurePrivateBucket(String bucket) {
        if (knownBuckets.contains(bucket)) {
            return;
        }
        try {
            String body = objectMapper.writeValueAsString(java.util.Map.of("id", bucket, "name", bucket, "public", false));
            HttpResponse<String> response = httpClient.send(authorize(HttpRequest.newBuilder(objectUri("/storage/v1/bucket"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build()), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 409) {
                verifyPrivateBucket(bucket);
            } else if (response.statusCode() != 200 && response.statusCode() != 201) {
                throw unavailable();
            }
            knownBuckets.add(bucket);
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw unavailable();
        }
    }

    private void verifyPrivateBucket(String bucket) {
        try {
            HttpResponse<String> response = send(HttpRequest.newBuilder(objectUri("/storage/v1/bucket/" + bucket)).GET().build());
            if (objectMapper.readTree(response.body()).path("public").asBoolean(true)) {
                throw unavailable();
            }
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw unavailable();
        }
    }

    private HttpRequest authorize(HttpRequest request) {
        String[] headers = request.headers().map().entrySet().stream()
                .flatMap(entry -> entry.getValue().stream().flatMap(value -> java.util.stream.Stream.of(entry.getKey(), value)))
                .toArray(String[]::new);
        HttpRequest.Builder builder = HttpRequest.newBuilder(request.uri())
                .method(request.method(), request.bodyPublisher().orElse(HttpRequest.BodyPublishers.noBody()))
                .header("apikey", serviceRoleKey)
                .header("Authorization", "Bearer " + serviceRoleKey);
        if (headers.length > 0) {
            builder.headers(headers);
        }
        return builder.build();
    }

    private URI objectUri(String path) {
        if (url.isBlank()) {
            throw unavailable();
        }
        return URI.create(url.replaceAll("/$", "") + "/" + java.util.Arrays.stream(path.substring(1).split("/"))
                .map(segment -> URLEncoder.encode(segment, StandardCharsets.UTF_8).replace("+", "%20"))
                .collect(java.util.stream.Collectors.joining("/")));
    }

    private BusinessException unavailable() {
        return new BusinessException("ARTIFACT_STORAGE_UNAVAILABLE", "制品存储暂不可用");
    }
}
