#pragma once

#include <Arduino.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <base64.h>
#include <esp_camera.h>
#include <img_converters.h>
#include <math.h>

#include "driver/i2s.h"
#include "unihiker_k10.h"

#include "../config.h"
#include "../server_cert.h"

struct __attribute__((packed)) WavHeader {
    char riff[4] = {'R', 'I', 'F', 'F'};
    uint32_t fileSize;
    char wave[4] = {'W', 'A', 'V', 'E'};
    char fmt[4] = {'f', 'm', 't', ' '};
    uint32_t fmtSize = 16;
    uint16_t audioFormat = 1;
    uint16_t numChannels = 1;
    uint32_t sampleRate = SAMPLE_RATE;
    uint32_t byteRate = SAMPLE_RATE * 2;
    uint16_t blockAlign = 2;
    uint16_t bitsPerSample = 16;
    char data[4] = {'d', 'a', 't', 'a'};
    uint32_t dataSize;
};

static_assert(sizeof(WavHeader) == 44, "WAV header must match the backend media contract");

class CameraCapture {
public:
    bool begin() {
        camera_config_t config = {};
        config.ledc_channel = LEDC_CHANNEL_0;
        config.ledc_timer = LEDC_TIMER_0;
        config.pin_d0 = 8; config.pin_d1 = 10; config.pin_d2 = 11; config.pin_d3 = 9;
        config.pin_d4 = 18; config.pin_d5 = 16; config.pin_d6 = 15; config.pin_d7 = 6;
        config.pin_xclk = 7; config.pin_pclk = 17; config.pin_vsync = 4; config.pin_href = 5;
        config.pin_sscb_sda = 47; config.pin_sscb_scl = 48;
        config.pin_pwdn = -1; config.pin_reset = -1;
        config.xclk_freq_hz = 10000000;
        config.pixel_format = PIXFORMAT_RGB565;
        config.frame_size = FRAMESIZE_QVGA;
        config.grab_mode = CAMERA_GRAB_LATEST;
        config.fb_count = 2;
        config.fb_location = CAMERA_FB_IN_PSRAM;
        config.jpeg_quality = 12;
        return esp_camera_init(&config) == ESP_OK;
    }

    bool captureBase64(String& output) {
        camera_fb_t* frame = esp_camera_fb_get();
        if (!frame) return false;
        uint8_t* jpeg = nullptr;
        size_t jpegSize = 0;
        bool converted = fmt2jpg(frame->buf, frame->len, frame->width, frame->height, frame->format, 12, &jpeg, &jpegSize);
        esp_camera_fb_return(frame);
        if (!converted || !jpeg || jpegSize > MAX_IMAGE_BYTES) {
            if (jpeg) free(jpeg);
            return false;
        }
        output = base64::encode(jpeg, jpegSize);
        free(jpeg);
        return true;
    }
};

class VoiceRecorder {
public:
    explicit VoiceRecorder(UNIHIKER_K10& k10) : _k10(k10) {}

    void begin() {
        _k10.initI2S();
        i2s_set_clk(I2S_PORT, SAMPLE_RATE, I2S_BITS_PER_SAMPLE_16BIT, I2S_CHANNEL_STEREO);
    }

    bool recordWav(uint8_t*& wav, size_t& wavSize) {
        const size_t pcmCapacity = SAMPLE_RATE * 2 * RECORD_DURATION_MS / 1000;
        int16_t* pcm = static_cast<int16_t*>(ps_malloc(pcmCapacity));
        if (!pcm) pcm = static_cast<int16_t*>(malloc(pcmCapacity));
        if (!pcm) return false;

        i2s_zero_dma_buffer(I2S_PORT);
        uint8_t discard[1024];
        size_t discarded = 0;
        i2s_read(I2S_PORT, discard, sizeof(discard), &discarded, 100);

        size_t pcmBytes = 0;
        uint8_t stereo[2048];
        unsigned long started = millis();
        while (millis() - started < RECORD_DURATION_MS && pcmBytes + sizeof(stereo) / 2 <= pcmCapacity) {
            size_t read = 0;
            if (i2s_read(I2S_PORT, stereo, sizeof(stereo), &read, 100) != ESP_OK) continue;
            int16_t* samples = reinterpret_cast<int16_t*>(stereo);
            size_t frames = read / sizeof(int16_t) / 2;
            for (size_t index = 0; index < frames; index++) {
                pcm[pcmBytes / 2 + index] = (static_cast<int32_t>(samples[index * 2]) + samples[index * 2 + 1]) / 2;
            }
            pcmBytes += frames * sizeof(int16_t);
        }

        if (pcmBytes < SAMPLE_RATE * 2) {
            free(pcm);
            return false;
        }
        uint64_t signal = 0;
        for (size_t index = 0; index < pcmBytes / sizeof(int16_t); index++) signal += abs(pcm[index]);
        if (signal < 100) {
            free(pcm);
            return false;
        }
        wavSize = sizeof(WavHeader) + pcmBytes;
        wav = static_cast<uint8_t*>(ps_malloc(wavSize));
        if (!wav) wav = static_cast<uint8_t*>(malloc(wavSize));
        if (!wav) {
            free(pcm);
            return false;
        }
        WavHeader header;
        header.fileSize = wavSize - 8;
        header.dataSize = pcmBytes;
        memcpy(wav, &header, sizeof(header));
        memcpy(wav + sizeof(header), pcm, pcmBytes);
        free(pcm);
        return true;
    }

    bool downloadAndPlay(const String& audioUrl, const String& deviceId, const String& token) {
        String url = audioUrl.startsWith("http") ? audioUrl : String(SERVER_HOST) + audioUrl;
        Serial.printf("[K10] audio action=download url_bytes=%u device_id_bytes=%u token_bytes=%u\n", url.length(), deviceId.length(), token.length());
        WiFiClientSecure client;
        client.setCACert(K10_SERVER_CA);
        HTTPClient http;
        if (!http.begin(client, url)) {
            Serial.println("[K10] audio action=download result=http-begin-failed");
            return false;
        }
        http.addHeader("X-Device-ID", deviceId);
        http.addHeader("Authorization", "Bearer " + token);
        int status = http.GET();
        int size = http.getSize();
        Serial.printf("[K10] audio action=download status=%d content_length=%d\n", status, size);
        if (status != HTTP_CODE_OK || size <= 44 || size > MAX_TTS_BYTES) {
            Serial.printf("[K10] audio action=download result=rejected status=%d content_length=%d\n", status, size);
            http.end();
            return false;
        }
        uint8_t* wav = static_cast<uint8_t*>(ps_malloc(size));
        if (!wav) wav = static_cast<uint8_t*>(malloc(size));
        if (!wav) {
            Serial.printf("[K10] audio action=download result=allocation-failed bytes=%d\n", size);
            http.end();
            return false;
        }
        WiFiClient* stream = http.getStreamPtr();
        size_t received = 0;
        unsigned long lastData = millis();
        while (received < static_cast<size_t>(size)) {
            int chunk = stream->read(wav + received, size - received);
            if (chunk > 0) {
                received += chunk;
                lastData = millis();
            }
            else if (!http.connected()) {
                Serial.println("[K10] audio action=download result=connection-closed");
                break;
            }
            else if (millis() - lastData > 10000) {
                Serial.println("[K10] audio action=download result=read-timeout");
                break;
            }
            else delay(5);
        }
        http.end();
        Serial.printf("[K10] audio action=download received_bytes=%u expected_bytes=%d\n", received, size);
        bool played = received == static_cast<size_t>(size) && playWav(wav, received);
        free(wav);
        Serial.printf("[K10] audio action=play result=%s\n", played ? "ok" : "failed");
        return played;
    }

private:
    UNIHIKER_K10& _k10;

    bool playWav(const uint8_t* wav, size_t size) {
        if (size < sizeof(WavHeader) || memcmp(wav, "RIFF", 4) || memcmp(wav + 8, "WAVE", 4)) {
            Serial.println("[K10] audio action=play result=invalid-wav-header");
            return false;
        }
        const uint16_t channels = *reinterpret_cast<const uint16_t*>(wav + 22);
        const uint32_t sampleRate = *reinterpret_cast<const uint32_t*>(wav + 24);
        const uint16_t bitsPerSample = *reinterpret_cast<const uint16_t*>(wav + 34);
        size_t dataOffset = 0;
        uint32_t dataSize = 0;
        for (size_t offset = 12; offset + 8 <= size; ) {
            uint32_t chunkSize = *reinterpret_cast<const uint32_t*>(wav + offset + 4);
            if (!memcmp(wav + offset, "data", 4)) {
                dataOffset = offset + 8;
                dataSize = chunkSize;
                break;
            }
            if (chunkSize > size - offset - 8) {
                Serial.println("[K10] audio action=play result=invalid-wav-chunk");
                return false;
            }
            offset += 8 + chunkSize + (chunkSize & 1);
        }
        if (!dataOffset || bitsPerSample != 16 || (channels != 1 && channels != 2)) {
            Serial.printf("[K10] audio action=play result=unsupported-wav channels=%u rate=%u bits=%u data_bytes=%u\n", channels, sampleRate, bitsPerSample, dataSize);
            return false;
        }
        if (dataSize > size - dataOffset) {
            Serial.printf("[K10] audio action=play data_size_header=%u source=content-length actual_bytes=%u\n", dataSize, size - dataOffset);
            dataSize = size - dataOffset;
        }

        Serial.printf("[K10] audio action=play format=pcm channels=%u rate=%u bits=%u data_bytes=%u\n", channels, sampleRate, bitsPerSample, dataSize);

        i2s_set_clk(I2S_PORT, sampleRate, I2S_BITS_PER_SAMPLE_16BIT, I2S_CHANNEL_STEREO);
        size_t written = 0;
        if (channels == 2) {
            while (written < dataSize) {
                size_t count = 0;
                size_t chunk = min(static_cast<size_t>(2048), static_cast<size_t>(dataSize - written));
                if (i2s_write(I2S_PORT, wav + dataOffset + written, chunk, &count, 200) != ESP_OK) {
                    Serial.println("[K10] audio action=play result=i2s-write-error");
                    return false;
                }
                if (!count) {
                    Serial.println("[K10] audio action=play result=i2s-write-zero");
                    return false;
                }
                written += count;
            }
        } else {
            int16_t stereo[512];
            while (written < dataSize) {
                size_t samples = min(static_cast<size_t>(256), static_cast<size_t>((dataSize - written) / 2));
                const int16_t* mono = reinterpret_cast<const int16_t*>(wav + dataOffset + written);
                for (size_t index = 0; index < samples; index++) stereo[index * 2] = stereo[index * 2 + 1] = mono[index];
                size_t count = 0;
                if (i2s_write(I2S_PORT, stereo, samples * 4, &count, 200) != ESP_OK) {
                    Serial.println("[K10] audio action=play result=i2s-write-error");
                    return false;
                }
                if (!count) {
                    Serial.println("[K10] audio action=play result=i2s-write-zero");
                    return false;
                }
                written += samples * 2;
            }
        }
        i2s_zero_dma_buffer(I2S_PORT);
        return true;
    }
};
