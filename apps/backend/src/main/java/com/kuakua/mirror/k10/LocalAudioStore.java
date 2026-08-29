package com.kuakua.mirror.k10;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LocalAudioStore {

    @Value("${k10.audio-directory:${java.io.tmpdir}/kuakua-mirror-audio}")
    private String audioDirectory;

    @Value("${k10.audio-ttl-minutes:10}")
    private long audioTtlMinutes;

    private Path directory;
    private final ConcurrentHashMap<String, String> owners = new ConcurrentHashMap<>();

    @PostConstruct
    void initialize() throws IOException {
        directory = Path.of(audioDirectory).toAbsolutePath().normalize();
        Files.createDirectories(directory);
    }

    public StoredAudio store(String deviceId, byte[] wav) throws IOException {
        String filename = UUID.randomUUID() + ".wav";
        Path file = directory.resolve(filename);
        Files.write(file, wav, StandardOpenOption.CREATE_NEW);
        owners.put(filename, deviceId);
        return new StoredAudio(filename, wavDuration(wav));
    }

    public FileSystemResource find(String deviceId, String filename) {
        if (!filename.matches("[a-f0-9-]+\\.wav")) {
            return null;
        }
        Path file = directory.resolve(filename).normalize();
        if (!deviceId.equals(owners.get(filename)) || !file.startsWith(directory) || !Files.isRegularFile(file)) {
            return null;
        }
        return new FileSystemResource(file);
    }

    public boolean ownedByAnotherDevice(String deviceId, String filename) {
        return filename.matches("[a-f0-9-]+\\.wav") && owners.containsKey(filename) && !deviceId.equals(owners.get(filename));
    }

    public void deleteByDeviceId(String deviceId) throws IOException {
        for (var entry : owners.entrySet()) {
            if (deviceId.equals(entry.getValue())) {
                Files.deleteIfExists(directory.resolve(entry.getKey()));
                owners.remove(entry.getKey(), deviceId);
            }
        }
    }

    @Scheduled(fixedRate = 60_000)
    void cleanupExpired() throws IOException {
        Instant expiresBefore = Instant.now().minus(Duration.ofMinutes(audioTtlMinutes));
        try (var files = Files.list(directory)) {
            files.filter(Files::isRegularFile)
                    .filter(file -> lastModifiedBefore(file, expiresBefore))
                    .forEach(this::deleteQuietly);
        }
    }

    private boolean lastModifiedBefore(Path file, Instant expiresBefore) {
        try {
            return Files.getLastModifiedTime(file).toInstant().isBefore(expiresBefore);
        } catch (IOException exception) {
            return false;
        }
    }

    private void deleteQuietly(Path file) {
        try {
            Files.deleteIfExists(file);
            owners.remove(file.getFileName().toString());
        } catch (IOException ignored) {
        }
    }

    private double wavDuration(byte[] wav) {
        // ponytail: assumes PCM WAV header; use a RIFF parser if providers emit variable chunks.
        if (wav.length < 44) {
            return 0;
        }
        int byteRate = ByteBuffer.wrap(wav, 28, 4).order(ByteOrder.LITTLE_ENDIAN).getInt();
        return byteRate > 0 ? Math.round((wav.length - 44) * 100.0 / byteRate) / 100.0 : 0;
    }

    public record StoredAudio(String filename, double duration) {
    }
}
