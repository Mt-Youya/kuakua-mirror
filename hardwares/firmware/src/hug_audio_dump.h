/*
 * hug_audio_dump.h — 临时诊断工具(AUDIO_DUMP 编译开关)
 *
 * 设备用自身 NVS 凭证调用后端 TTS,把 8 句 wav 经串口以 hex 行回传,
 * 由 PC 侧脚本采集重组为 built-in 音频资产。仅在 -DAUDIO_DUMP 构建时挂入。
 */

#ifndef HUG_AUDIO_DUMP_H
#define HUG_AUDIO_DUMP_H

#include <Arduino.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "config.h"
#include "server_cert.h"
#include "modules/credentials.h"
#include "modules/api_client.h"

static bool dumpLineAudio(K10ApiClient& api, CredentialStore& credentials, int idx) {
    const char* text = HUG_COMFORT_LINES[idx];
    String audioUrl = api.synthesize(text);
    if (!audioUrl.length()) {
        Serial.printf("[AUDIODUMP] synth-failed idx=%d\n", idx);
        return false;
    }
    String url = audioUrl.startsWith("http") ? audioUrl : String(SERVER_HOST) + audioUrl;
    WiFiClientSecure client;
    client.setCACert(K10_SERVER_CA);
    HTTPClient http;
    if (!http.begin(client, url)) {
        Serial.printf("[AUDIODUMP] http-begin-failed idx=%d\n", idx);
        return false;
    }
    http.addHeader("X-Device-ID", credentials.deviceId());
    http.addHeader("Authorization", "Bearer " + credentials.token());
    int status = http.GET();
    int size = http.getSize();
    if (status != HTTP_CODE_OK || size <= 44 || size > MAX_TTS_BYTES) {
        Serial.printf("[AUDIODUMP] fetch-failed idx=%d status=%d size=%d\n", idx, status, size);
        http.end();
        return false;
    }
    uint8_t* wav = (uint8_t*)ps_malloc(size);
    if (!wav) wav = (uint8_t*)malloc(size);
    if (!wav) { http.end(); return false; }
    WiFiClient* stream = http.getStreamPtr();
    size_t received = 0;
    while (received < (size_t)size) {
        int chunk = stream->read(wav + received, size - received);
        if (chunk > 0) received += chunk;
        else if (!http.connected()) break;
        else delay(5);
    }
    http.end();
    if (received != (size_t)size) {
        Serial.printf("[AUDIODUMP] short-read idx=%d got=%u want=%d\n", idx, received, size);
        free(wav);
        return false;
    }
    // 剥掉 WAV 头,只回传 data chunk 的 PCM(16k 单声道)
    uint32_t dataOff = 0, dataSize = 0;
    for (size_t off = 12; off + 8 <= received;) {
        uint32_t chunkSize = *reinterpret_cast<const uint32_t*>(wav + off + 4);
        if (!memcmp(wav + off, "data", 4)) { dataOff = off + 8; dataSize = chunkSize; break; }
        off += 8 + chunkSize + (chunkSize & 1);
    }
    if (!dataOff || dataOff + 8 > received) {
        Serial.printf("[AUDIODUMP] bad-wav idx=%d off=%u\n", idx, dataOff);
        free(wav);
        return false;
    }
    // 后端 WAV 头的 data 块大小字段不可信(曾出现 2GB 级失真),按实际剩余字节截断
    uint32_t avail = (uint32_t)(received - dataOff);
    if (dataSize > avail) dataSize = avail;
    if (dataSize < 16000) {
        Serial.printf("[AUDIODUMP] pcm-too-short idx=%d bytes=%u\n", idx, dataSize);
        free(wav);
        return false;
    }
    const uint8_t* pcm = wav + dataOff;
    Serial.printf("[AUDIODUMP] begin idx=%d bytes=%u rate=16k ch=1\n", idx, dataSize);
    char hexLine[512];
    for (uint32_t off = 0; off < dataSize; off += 100) {
        uint32_t n = dataSize - off < 100 ? dataSize - off : 100;
        char* p = hexLine;
        for (uint32_t i = 0; i < n; i++) {
            uint8_t b = pcm[off + i];
            // 小写 hex:板载日志都是大写字母,PC 端只收 [0-9a-f],天然滤噪
            *p++ = "0123456789abcdef"[b >> 4];
            *p++ = "0123456789abcdef"[b & 0x0F];
        }
        *p = 0;
        Serial.printf("hex=%s\n", hexLine);
        yield();
    }
    Serial.printf("[AUDIODUMP] end idx=%d\n", idx);
    free(wav);
    return true;
}

// 触发一次全量导出(每句:合成 → 下载 → hex 回传);单句失败自动重试一次
static void dumpAllLines(K10ApiClient& api, CredentialStore& credentials) {
    for (int i = 0; i < HUG_COMFORT_LINES_COUNT; i++) {
        if (!dumpLineAudio(api, credentials, i)) {
            delay(500);
            Serial.printf("[AUDIODUMP] retry idx=%d\n", i);
            dumpLineAudio(api, credentials, i);
        }
    }
    Serial.println("[AUDIODUMP] all done");
}

#endif // HUG_AUDIO_DUMP_H