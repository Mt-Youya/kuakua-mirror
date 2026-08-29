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
        
        _connected = false;
        _tlsConnected = false;
        
        // 解析 URL → host + path + port
        String host, path;
        int port = 443;
        bool useHttps = true;
        
        if (url.startsWith("https://")) {
            host = url.substring(8);
        } else if (url.startsWith("http://")) {
            host = url.substring(7);
            useHttps = false;
            port = 80;
        } else {
            host = url;
        }
        
        int slashPos = host.indexOf('/');
        if (slashPos > 0) {
            path = host.substring(slashPos);
            host = host.substring(0, slashPos);
        } else {
            path = "/";
        }
        
        // 检查 host:port 格式
        int colonPos = host.indexOf(':');
        if (colonPos > 0) {
            port = host.substring(colonPos + 1).toInt();
            host = host.substring(0, colonPos);
        }
        
        Serial.printf("[TLS] host=%s port=%d path=%s https=%d\n", host.c_str(), port, path.c_str(), useHttps);
        
        // 1. TLS 连接
        if (useHttps) {
            _tls.setCACert(K10_SERVER_CA);
        }
        
        Serial.println("[TLS] 连接中...");
        if (!_tls.connect(host.c_str(), port)) {
            Serial.println("[TLS] ❌ 连接失败");
            _httpCode = -1;
            return false;
        }
        Serial.println("[TLS] ✅ 连接成功");
        _tlsConnected = true;
        
        // 2. 构造 HTTP 请求头
        String headers = "POST " + path + " HTTP/1.1\r\n";
        headers += "Host: " + host + "\r\n";
        headers += "Content-Type: application/json\r\n";
        headers += "Accept: text/event-stream\r\n";
        headers += "Cache-Control: no-cache\r\n";
        headers += "Accept-Encoding: identity\r\n";
        headers += "X-Device-ID: " + deviceId + "\r\n";
        if (deviceToken.length() > 0) {
            headers += "Authorization: Bearer " + deviceToken + "\r\n";
        }
        Serial.printf("[HTTP] auth device_id_bytes=%u token_bytes=%u token_fingerprint=%08lx\n", deviceId.length(), deviceToken.length(), tokenFingerprint(deviceToken));
        headers += "Content-Length: " + String(jsonBody.length()) + "\r\n";
        headers += "Connection: keep-alive\r\n";
        headers += "\r\n";
        
        // 3. 发送 headers
        size_t headerLen = headers.length();
        size_t written = _tls.write((const uint8_t*)headers.c_str(), headerLen);
        Serial.printf("[HTTP] Headers 发送 %d/%d\n", (int)written, (int)headerLen);
        if (written != headerLen) {
            Serial.println("[HTTP] ❌ Headers 发送不完整");
            _httpCode = -3;
            _tls.stop();
            _tlsConnected = false;
            return false;
        }
        
        // 4. 分块发送 body（每次 4KB）
        size_t bodyLen = jsonBody.length();
        const char* bodyPtr = jsonBody.c_str();
        size_t totalSent = 0;
        size_t chunkSize = 4096;
        
        Serial.printf("[HTTP] body 分块发送 %d 字节, 每块 %d...\n", (int)bodyLen, (int)chunkSize);
        while (totalSent < bodyLen) {
            size_t toSend = (bodyLen - totalSent < chunkSize) ? (bodyLen - totalSent) : chunkSize;
            size_t sent = _tls.write((const uint8_t*)(bodyPtr + totalSent), toSend);
            if (sent == 0) {
                Serial.printf("[HTTP] ❌ body 发送失败 at %d/%d\n", (int)totalSent, (int)bodyLen);
                _httpCode = -3;
                _tls.stop();
                _tlsConnected = false;
                return false;
            }
            totalSent += sent;
            // 每 32KB 打印一次进度
            if (totalSent % 32768 < chunkSize) {
                Serial.printf("[HTTP] 已发 %d/%d\n", (int)totalSent, (int)bodyLen);
            }
            // 小 delay 让 TLS 缓冲区刷新
            delay(2);
        }
        Serial.printf("[HTTP] body 发送完成 %d/%d\n", (int)totalSent, (int)bodyLen);
        
        // 5. 读取 HTTP 响应状态行
        // 等待数据到达
        unsigned long waitStart = millis();
        while (_tls.available() == 0) {
            if (millis() - waitStart > 15000) {
                Serial.println("[HTTP] ❌ 等待响应超时");
                _httpCode = -11;
                _tls.stop();
                _tlsConnected = false;
                return false;
            }
            delay(10);
        }
        
        // 读状态行: "HTTP/1.1 200 OK\r\n"
        String statusLine = _tls.readStringUntil('\n');
        statusLine.trim();
        Serial.printf("[HTTP] 响应: %s\n", statusLine.c_str());
        
        // 解析状态码
        int codeStart = statusLine.indexOf(' ');
        if (codeStart < 0) {
            Serial.println("[HTTP] ❌ 无法解析状态行");
            _httpCode = -1;
            _tls.stop();
            _tlsConnected = false;
            return false;
        }
        _httpCode = statusLine.substring(codeStart + 1, codeStart + 4).toInt();
        Serial.printf("[HTTP] 状态码: %d\n", _httpCode);
        
        // 6. 读取并跳过剩余 headers（直到空行）
        while (_tls.connected()) {
            String headerLine = _tls.readStringUntil('\n');
            headerLine.trim();
            if (headerLine.length() == 0) {
                break;  // 空行 = headers 结束
            }
            // 打印部分 header 用于调试
            if (headerLine.length() < 100) {
                Serial.printf("[HTTP-HDR] %s\n", headerLine.c_str());
            }
        }
        
        // 7. 检查状态码
        if (_httpCode == HTTP_CODE_OK || _httpCode == HTTP_CODE_CREATED) {
            _connected = true;
            Serial.println("[SSE] ✅ SSE 流已建立");
            return true;
        }
        
        // 非 200 — 读取错误 body
        String errBody = _tls.readString();
        Serial.printf("[HTTP] ❌ 错误响应 body: %s\n", errBody.substring(0, 500).c_str());
        _tls.stop();
        _tlsConnected = false;
        _connected = false;
        return false;
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
