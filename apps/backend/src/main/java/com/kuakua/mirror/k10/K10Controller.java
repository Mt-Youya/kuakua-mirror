package com.kuakua.mirror.k10;

import com.alibaba.dashscope.common.Message;
import com.kuakua.mirror.ai.infra.DashScopeService;
import com.kuakua.mirror.device.domain.Device;
import com.kuakua.mirror.shared.exception.BusinessException;
import com.kuakua.mirror.k10.LocalAudioStore.StoredAudio;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@RestController
@RequiredArgsConstructor
public class K10Controller {

    private static final int MAX_IMAGE_BYTES = 500 * 1024;
    private static final int MAX_AUDIO_BYTES = 1024 * 1024;
    private static final int MAX_TEXT_LENGTH = 100;
    private static final String SYSTEM_PROMPT = "你是夸夸镜，一个温暖、真诚的 AI 助手。请用简洁自然的中文鼓励用户。";

    private final DashScopeService dashScopeService;
    private final LocalAudioStore audioStore;
    private final Map<String, ChatSession> sessions = new ConcurrentHashMap<>();

    @PostMapping(value = "/api/praise/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<Map<String, Object>>> praise(
            @RequestHeader("X-Device-ID") String deviceId,
            @AuthenticationPrincipal Device device,
            @RequestBody PraiseRequest request) {
        validateDevice(device, deviceId, request.deviceId());
        byte[] image;
        try {
            image = decode(request.imageBase64(), MAX_IMAGE_BYTES, "图片");
        } catch (IllegalArgumentException exception) {
            return Flux.just(event(Map.of("type", "error", "message", exception.getMessage())));
        }

        StringBuilder praise = new StringBuilder();
        AtomicInteger index = new AtomicInteger();
        return Flux.concat(
                Flux.just(event(Map.of("type", "status", "content", "正在分析照片...", "step", 1))),
                dashScopeService.streamImagePraise("data:image/jpeg;base64," + Base64.getEncoder().encodeToString(image))
                        .doOnNext(praise::append)
                        .map(text -> event(Map.of("type", "text", "content", text, "index", index.getAndIncrement()))),
                Flux.defer(() -> synthesizeEvent(deviceId, praise.toString())),
                Mono.fromSupplier(() -> event(Map.of(
                        "type", "complete",
                        "full_text", praise.toString(),
                        "praise_id", "praise-" + System.currentTimeMillis()
                ))).flux()
        ).onErrorResume(exception -> Flux.just(event(Map.of("type", "error", "message", "服务繁忙"))));
    }

    @PostMapping(value = "/api/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<Map<String, Object>>> chat(
            @RequestHeader("X-Device-ID") String deviceId,
            @AuthenticationPrincipal Device device,
            @RequestBody ChatRequest request) {
        validateDevice(device, deviceId, request.deviceId());
        if (isBlank(request.sessionId())) {
            return Flux.just(event(Map.of("type", "error", "message", "session_id 不能为空")));
        }
        byte[] audio;
        try {
            audio = decode(request.audioBase64(), MAX_AUDIO_BYTES, "音频");
        } catch (IllegalArgumentException exception) {
            return Flux.just(event(Map.of("type", "error", "message", exception.getMessage())));
        }

        AtomicInteger index = new AtomicInteger();
        StringBuilder reply = new StringBuilder();
        return Flux.concat(
                Flux.just(event(Map.of("type", "status", "content", "正在识别语音...", "step", 1))),
                dashScopeService.transcribe(audio).flatMapMany(transcript -> {
                    List<Message> messages = appendUserMessage(deviceId, request.sessionId(), transcript);
                    return Flux.concat(
                            Flux.just(event(Map.of("type", "asr_result", "user_text", transcript))),
                            Flux.just(event(Map.of("type", "status", "content", "AI思考中...", "step", 2))),
                            dashScopeService.streamText(messages)
                                    .doOnNext(reply::append)
                                    .map(text -> event(Map.of("type", "text", "content", text, "index", index.getAndIncrement()))),
                            Flux.defer(() -> {
                                appendAssistantMessage(deviceId, request.sessionId(), reply.toString());
                                return synthesizeEvent(deviceId, reply.toString());
                            }),
                            Mono.fromSupplier(() -> event(Map.of(
                                    "type", "complete",
                                    "user_text", transcript,
                                    "ai_text", reply.toString(),
                                    "session_end", false
                            ))).flux()
                    );
                })
        ).onErrorResume(exception -> Flux.just(event(Map.of("type", "error", "message", "服务繁忙"))));
    }

    @PostMapping("/api/tts")
    public Mono<ResponseEntity<K10Response<Map<String, Object>>>> tts(
            @RequestHeader("X-Device-ID") String deviceId,
            @AuthenticationPrincipal Device device,
            @RequestBody TtsRequest request) {
        validateDevice(device, deviceId, request.deviceId());
        if (isBlank(request.text()) || request.text().length() > MAX_TEXT_LENGTH) {
            return Mono.just(ResponseEntity.badRequest().body(K10Response.error(400,
                    "text 必须为 1 到 100 个字符")));
        }
        return dashScopeService.synthesize(request.text())
                .map(audio -> storeAudio(deviceId, audio))
                .map(audio -> ResponseEntity.ok(K10Response.success(audioData(audio))))
                .onErrorResume(exception -> Mono.just(ResponseEntity.internalServerError()
                        .body(K10Response.error(500, "语音合成失败"))));
    }

    @GetMapping("/audio/{filename:.+}")
    public ResponseEntity<FileSystemResource> audio(@PathVariable String filename, @AuthenticationPrincipal Device device) {
        if (audioStore.ownedByAnotherDevice(device.getDeviceId(), filename)) {
            throw new BusinessException("UNAUTHORIZED", "设备无权访问该音频");
        }
        FileSystemResource audio = audioStore.find(device.getDeviceId(), filename);
        if (audio == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("audio/wav"))
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(audio);
    }

    private Flux<ServerSentEvent<Map<String, Object>>> synthesizeEvent(String deviceId, String text) {
        if (isBlank(text)) {
            return Flux.empty();
        }
        return dashScopeService.synthesize(text)
                .map(audio -> storeAudio(deviceId, audio))
                .map(audio -> event(Map.of(
                        "type", "audio",
                        "url", "/audio/" + audio.filename(),
                        "duration", audio.duration()
                )))
                .flux();
    }

    private StoredAudio storeAudio(String deviceId, byte[] audio) {
        try {
            return audioStore.store(deviceId, audio);
        } catch (Exception exception) {
            throw new IllegalStateException("无法保存音频", exception);
        }
    }

    private Map<String, Object> audioData(StoredAudio audio) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("audio_url", "/audio/" + audio.filename());
        data.put("duration", audio.duration());
        data.put("format", "wav");
        data.put("sample_rate", 16000);
        return data;
    }

    private List<Message> appendUserMessage(String deviceId, String sessionId, String text) {
        ChatSession session = session(deviceId, sessionId);
        synchronized (session) {
            session.messages.add(Message.builder().role("user").content(text).build());
            trimHistory(session.messages);
            session.lastAccess = System.currentTimeMillis();
            List<Message> messages = new ArrayList<>();
            messages.add(Message.builder().role("system").content(SYSTEM_PROMPT).build());
            messages.addAll(session.messages);
            return messages;
        }
    }

    private void appendAssistantMessage(String deviceId, String sessionId, String text) {
        ChatSession session = session(deviceId, sessionId);
        synchronized (session) {
            session.messages.add(Message.builder().role("assistant").content(text).build());
            trimHistory(session.messages);
            session.lastAccess = System.currentTimeMillis();
        }
    }

    private ChatSession session(String deviceId, String sessionId) {
        String key = deviceId + ":" + sessionId;
        return sessions.compute(key, (ignored, current) -> current == null || current.lastAccess < System.currentTimeMillis() - Duration.ofMinutes(5).toMillis()
                ? new ChatSession()
                : current);
    }

    private void trimHistory(List<Message> messages) {
        while (messages.size() > 6) {
            messages.removeFirst();
        }
    }

    private byte[] decode(String value, int maxBytes, String name) {
        if (isBlank(value)) {
            throw new IllegalArgumentException(name + "不能为空");
        }
        String base64 = value.startsWith("data:") ? value.substring(value.indexOf(',') + 1) : value;
        if (base64.length() > ((maxBytes + 2) / 3) * 4) {
            throw new IllegalArgumentException(name + "过大");
        }
        final byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(base64);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException(name + "不是有效 Base64");
        }
        if (bytes.length > maxBytes) {
            throw new IllegalArgumentException(name + "过大");
        }
        return bytes;
    }

    private void validateDevice(Device device, String headerDeviceId, String bodyDeviceId) {
        if (isBlank(headerDeviceId)) {
            throw new BusinessException("UNAUTHORIZED", "设备标识不一致");
        }
        if (isBlank(bodyDeviceId) || !headerDeviceId.equals(bodyDeviceId) || !headerDeviceId.equals(device.getDeviceId())) {
            throw new BusinessException("UNAUTHORIZED", "设备标识不一致");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private ServerSentEvent<Map<String, Object>> event(Map<String, Object> data) {
        return ServerSentEvent.<Map<String, Object>>builder().event("message").data(data).build();
    }

    private static final class ChatSession {
        private final List<Message> messages = new ArrayList<>();
        private long lastAccess = System.currentTimeMillis();
    }

    public record PraiseRequest(String device_id, String image_base64, Long timestamp) {
        String deviceId() { return device_id; }
        String imageBase64() { return image_base64; }
    }

    public record ChatRequest(String device_id, String audio_base64, String session_id, Long timestamp) {
        String deviceId() { return device_id; }
        String audioBase64() { return audio_base64; }
        String sessionId() { return session_id; }
    }

    public record TtsRequest(String device_id, String text, String voice, String format) {
        String deviceId() { return device_id; }
    }

    public record K10Response<T>(int code, String message, T data) {
        static <T> K10Response<T> success(T data) {
            return new K10Response<>(200, "success", data);
        }

        static <T> K10Response<T> error(int code, String message) {
            return new K10Response<>(code, message, null);
        }
    }
}
