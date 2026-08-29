/*
 * K10 夸夸镜 - SSE (Server-Sent Events) 客户端
 * 支持 POST 上传 + 解析后端推送的多种流式事件（对话版）
 * 
 * v2: 手动 TLS + 分块 tls.write() 发送，绕过 HTTPClient 大 body 限制
 */

#ifndef SSE_CLIENT_H
#define SSE_CLIENT_H

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <mbedtls/base64.h>
#include "config.h"
#include "server_cert.h"

// ==================== SSE 事件类型 ====================
enum SseEventType {
    SSE_UNKNOWN,
    SSE_STATUS,      // 处理状态
    SSE_ASR_RESULT,  // 语音识别结果
    SSE_TEXT,        // 文本片段（AI 回复逐字）
    SSE_AUDIO,       // 音频 URL 就绪
    SSE_COMPLETE,    // 完成
    SSE_ERROR        // 错误
};

static uint32_t tokenFingerprint(const String& value) {
    uint32_t hash = 2166136261u;
    for (size_t index = 0; index < value.length(); index++) hash = (hash ^ static_cast<uint8_t>(value[index])) * 16777619u;
    return hash;
}

// ==================== SSE 事件结构 ====================
struct SseEvent {
    SseEventType type;
    String content;      // 文本内容 或 音频 URL
    int index;           // 文本索引
    String fullText;     // 完整文本（COMPLETE 时的 ai_text）
    String userText;     // ASR 识别结果（ASR_RESULT 或 COMPLETE 时）
    bool sessionEnd;     // 会话是否结束（COMPLETE 时）
    bool success;
    String errorMsg;
};

// ==================== SSE 客户端类 ====================
class SseClient {
public:
    SseClient() : _httpCode(0), _connected(false), _tlsConnected(false) {}

    // 连接 SSE 流（POST，上传 JSON body）
    // v2: 手动 TLS + 分块发送，绕过 HTTPClient 大 body 限制
    bool connectPost(const String& url,
                     const String& jsonBody,
                     const String& deviceId,
                     const String& deviceToken) {
        if (!beginPost(url, jsonBody.length(), deviceId, deviceToken)) return false;
        size_t totalSent = 0;
        Serial.printf("[HTTP] body 分块发送 %u 字节, 每块 4096...\n", jsonBody.length());
        if (!sendBodyPart(reinterpret_cast<const uint8_t*>(jsonBody.c_str()), jsonBody.length(), totalSent, jsonBody.length())) return false;
        Serial.printf("[HTTP] body 发送完成 %u/%u\n", totalSent, jsonBody.length());
        return finishPost();
    }

    bool connectPostWav(const String& url, const uint8_t* wav, size_t wavSize,
                        const String& deviceId, const String& deviceToken,
                        const String& sessionId, unsigned long timestamp) {
        String prefix = "{\"device_id\":\"" + deviceId + "\",\"audio_base64\":\"";
        String suffix = "\",\"session_id\":\"" + sessionId + "\",\"timestamp\":" + String(timestamp) + "}";
        const size_t encodedSize = ((wavSize + 2) / 3) * 4;
        const size_t bodySize = prefix.length() + encodedSize + suffix.length();
        if (!beginPost(url, bodySize, deviceId, deviceToken)) return false;

        size_t totalSent = 0;
        Serial.printf("[HTTP] body 流式发送 %u 字节, wav_bytes=%u...\n", bodySize, wavSize);
        if (!sendBodyPart(reinterpret_cast<const uint8_t*>(prefix.c_str()), prefix.length(), totalSent, bodySize)) return false;

        // ponytail: K10 interactions are synchronous; make this per-client only if concurrent uploads are introduced.
        static char encoded[4097];
        for (size_t offset = 0; offset < wavSize; ) {
            const size_t sourceSize = min(static_cast<size_t>(3072), wavSize - offset);
            size_t written = 0;
            if (mbedtls_base64_encode(reinterpret_cast<unsigned char*>(encoded), sizeof(encoded), &written, wav + offset, sourceSize) != 0) {
                Serial.println("[HTTP] ❌ WAV Base64 流式编码失败");
                disconnect();
                return false;
            }
            if (!sendBodyPart(reinterpret_cast<const uint8_t*>(encoded), written, totalSent, bodySize)) return false;
            offset += sourceSize;
        }
        if (!sendBodyPart(reinterpret_cast<const uint8_t*>(suffix.c_str()), suffix.length(), totalSent, bodySize)) return false;
        Serial.printf("[HTTP] body 发送完成 %u/%u\n", totalSent, bodySize);
        if (totalSent != bodySize) {
            Serial.println("[HTTP] ❌ body 长度不一致");
            disconnect();
            return false;
        }
        return finishPost();
    }

    // 断开连接
    void disconnect() {
        if (_tlsConnected) {
            _tls.stop();
            _tlsConnected = false;
        }
        _connected = false;
    }

    // 检查是否连接
    bool isConnected() {
        return _connected && _tlsConnected && _tls.connected();
    }

    // 阻塞式读取并解析下一个完整事件（带超时）
    bool readEventBlocking(SseEvent& event, unsigned long timeoutMs = 3000) {
        unsigned long start = millis();
        String currentData = "";
        bool hasData = false;

        while (millis() - start < timeoutMs) {
            if (!isConnected()) {
                Serial.println("[SSE] Server disconnected");
                return false;
            }
            if (_tls.available() == 0) {
                delay(10);
                continue;
            }

            String line = _tls.readStringUntil('\n');
            line.trim();

            // 跳过 chunked 编码的 chunk 大小行（纯十六进制，1-8 字符）
            if (line.length() > 0 && line.length() <= 8) {
                bool allHex = true;
                for (int i = 0; i < (int)line.length(); i++) {
                    char c = line[i];
                    if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'))) {
                        allHex = false;
                        break;
                    }
                }
                if (allHex) continue;
            }

            // 跳过 "event:message" 行
            if (line.startsWith("event:")) continue;

            if (line.length() > 0) {
                Serial.printf("[SSE-RAW] %s\n", line.substring(0, min((int)line.length(), 200)).c_str());
            }

            // data: 行 — JSON 的一部分
            if (line.startsWith("data:")) {
                String d = line.substring(5);
                d.trim();
                if (d.length() > 0) {
                    if (hasData) currentData += "\n";
                    currentData += d;
                    hasData = true;
                }
                continue;
            }

            // 非 data: 的非空行（如单独的 { 或 }）— 也拼接到 currentData
            // 后端有时把 JSON 的 { 和 } 放在单独行，不以 data: 开头
            if (line.length() > 0) {
                if (hasData) currentData += "\n";
                currentData += line;
                hasData = true;
                continue;
            }

            // 空行 = 事件终止，尝试解析累积的 data
            if (line.length() == 0 && hasData) {
                if (parseEventData(currentData, event)) {
                    return true;
                }
                currentData = "";
                hasData = false;
                continue;
            }
        }
        return false;  // 超时
    }

    // 获取 HTTP 状态码
    int getHttpCode() { return _httpCode; }

private:
    WiFiClientSecure _tls;
    int _httpCode;
    bool _connected;
    bool _tlsConnected;

    bool beginPost(const String& url, size_t bodySize, const String& deviceId, const String& deviceToken) {
        _connected = false;
        _tlsConnected = false;
        String host = url.startsWith("https://") ? url.substring(8) : url;
        int port = url.startsWith("https://") ? 443 : 80;
        int slashPos = host.indexOf('/');
        String path = slashPos > 0 ? host.substring(slashPos) : "/";
        if (slashPos > 0) host = host.substring(0, slashPos);
        int colonPos = host.indexOf(':');
        if (colonPos > 0) {
            port = host.substring(colonPos + 1).toInt();
            host = host.substring(0, colonPos);
        }
        Serial.printf("[TLS] host=%s port=%d path=%s https=1\n", host.c_str(), port, path.c_str());
        _tls.setCACert(K10_SERVER_CA);
        Serial.println("[TLS] 连接中...");
        if (!_tls.connect(host.c_str(), port)) {
            Serial.println("[TLS] ❌ 连接失败");
            _httpCode = -1;
            return false;
        }
        Serial.println("[TLS] ✅ 连接成功");
        _tlsConnected = true;
        String headers = "POST " + path + " HTTP/1.1\r\nHost: " + host + "\r\nContent-Type: application/json\r\nAccept: text/event-stream\r\nCache-Control: no-cache\r\nAccept-Encoding: identity\r\nX-Device-ID: " + deviceId + "\r\nAuthorization: Bearer " + deviceToken + "\r\nContent-Length: " + String(bodySize) + "\r\nConnection: keep-alive\r\n\r\n";
        Serial.printf("[HTTP] auth device_id_bytes=%u token_bytes=%u token_fingerprint=%08lx\n", deviceId.length(), deviceToken.length(), tokenFingerprint(deviceToken));
        size_t written = _tls.write(reinterpret_cast<const uint8_t*>(headers.c_str()), headers.length());
        Serial.printf("[HTTP] Headers 发送 %u/%u\n", written, headers.length());
        if (written == headers.length()) return true;
        Serial.println("[HTTP] ❌ Headers 发送不完整");
        disconnect();
        return false;
    }

    bool sendBodyPart(const uint8_t* data, size_t size, size_t& totalSent, size_t bodySize) {
        for (size_t offset = 0; offset < size; ) {
            const size_t partSize = min(static_cast<size_t>(4096), size - offset);
            const size_t written = _tls.write(data + offset, partSize);
            if (!written) {
                Serial.printf("[HTTP] ❌ body 发送失败 at %u/%u\n", totalSent, bodySize);
                disconnect();
                return false;
            }
            offset += written;
            totalSent += written;
            if (totalSent % 32768 < partSize) Serial.printf("[HTTP] 已发 %u/%u\n", totalSent, bodySize);
            delay(2);
        }
        return true;
    }

    bool finishPost() {
        unsigned long waitStart = millis();
        while (_tls.available() == 0) {
            if (millis() - waitStart > 15000) {
                Serial.println("[HTTP] ❌ 等待响应超时");
                disconnect();
                return false;
            }
            delay(10);
        }
        String statusLine = _tls.readStringUntil('\n');
        statusLine.trim();
        Serial.printf("[HTTP] 响应: %s\n", statusLine.c_str());
        int codeStart = statusLine.indexOf(' ');
        if (codeStart < 0) {
            Serial.println("[HTTP] ❌ 无法解析状态行");
            disconnect();
            return false;
        }
        _httpCode = statusLine.substring(codeStart + 1, codeStart + 4).toInt();
        Serial.printf("[HTTP] 状态码: %d\n", _httpCode);
        while (_tls.connected()) {
            String headerLine = _tls.readStringUntil('\n');
            headerLine.trim();
            if (!headerLine.length()) break;
            if (headerLine.length() < 100) Serial.printf("[HTTP-HDR] %s\n", headerLine.c_str());
        }
        if (_httpCode == HTTP_CODE_OK || _httpCode == HTTP_CODE_CREATED) {
            _connected = true;
            Serial.println("[SSE] ✅ SSE 流已建立");
            return true;
        }
        String errBody = _tls.readString();
        Serial.printf("[HTTP] ❌ 错误响应 body: %s\n", errBody.substring(0, 500).c_str());
        disconnect();
        return false;
    }

    // 解析一条 data 的 JSON，填充 event
    bool parseEventData(const String& data, SseEvent& event) {
        if (data.length() == 0) return false;

        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, data);

        if (error) {
            Serial.println("[SSE] JSON parse error: " + String(error.c_str()));
            event.type = SSE_ERROR;
            event.success = false;
            event.errorMsg = "JSON parse error";
            return true;
        }

        String type = doc["type"] | "";

        if (type == "text") {
            event.type = SSE_TEXT;
            event.content = doc["content"] | "";
            event.index = doc["index"] | 0;
            event.success = true;
            return true;
        }
        if (type == "audio") {
            event.type = SSE_AUDIO;
            event.content = doc["url"] | "";
            Serial.printf("[SSE-PARSE] audio: url='%s' (len=%d)\n", event.content.c_str(), event.content.length());
            event.success = true;
            return true;
        }
        if (type == "complete") {
            event.type = SSE_COMPLETE;
            event.fullText = doc["full_text"] | doc["ai_text"] | "";
            event.userText = doc["user_text"] | "";
            event.sessionEnd = doc["session_end"] | false;
            event.success = true;
            return true;
        }
        if (type == "error") {
            event.type = SSE_ERROR;
            event.errorMsg = doc["message"] | "Unknown error";
            event.success = false;
            return true;
        }
        if (type == "status") {
            event.type = SSE_STATUS;
            event.content = doc["content"] | "";
            event.success = true;
            return true;
        }
        if (type == "asr_result") {
            event.type = SSE_ASR_RESULT;
            event.userText = doc["user_text"] | "";
            event.success = true;
            return true;
        }

        event.type = SSE_UNKNOWN;
        event.success = false;
        return false;
    }
};

#endif // SSE_CLIENT_H
