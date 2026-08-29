#pragma once

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

#include "../config.h"
#include "../server_cert.h"
#include "../sse_client.h"

struct StreamResult {
    bool success = false;
    String text;
    String transcript;
    String audioUrl;
};

class K10ApiClient {
public:
    K10ApiClient(const String& deviceId, const String& token) : _deviceId(deviceId), _token(token) {}

    StreamResult praise(const String& imageBase64) {
        String body = "{\"device_id\":\"" + _deviceId + "\",\"image_base64\":\"" + imageBase64 + "\",\"timestamp\":" + String(millis()) + "}";
        Serial.printf("[K10] api action=praise image_base64_bytes=%u request_bytes=%u token_bytes=%u\n", imageBase64.length(), body.length(), _token.length());
        return stream(API_PRAISE_STREAM, body);
    }

    StreamResult chat(const uint8_t* wav, size_t wavSize, const String& sessionId) {
        StreamResult result;
        const size_t audioBase64Size = ((wavSize + 2) / 3) * 4;
        Serial.printf("[K10] api action=chat wav_bytes=%u audio_base64_bytes=%u token_bytes=%u\n", wavSize, audioBase64Size, _token.length());
        SseClient client;
        if (!client.connectPostWav(String(SERVER_HOST) + API_CHAT_STREAM, wav, wavSize, _deviceId, _token, sessionId, millis())) {
            Serial.println("[K10] api action=stream result=connect-failed");
            return result;
        }
        return readStream(client);
    }

    String synthesize(const String& text) {
        WiFiClientSecure client;
        client.setCACert(K10_SERVER_CA);
        HTTPClient http;
        if (!http.begin(client, String(SERVER_HOST) + API_TTS)) {
            Serial.println("[K10] api action=tts result=http-begin-failed");
            return "";
        }
        http.addHeader("Content-Type", "application/json");
        http.addHeader("X-Device-ID", _deviceId);
        http.addHeader("Authorization", "Bearer " + _token);
        String body = "{\"device_id\":\"" + _deviceId + "\",\"text\":\"" + jsonEscape(text) + "\"}";
        int status = http.POST(body);
        if (status != HTTP_CODE_OK) {
            Serial.printf("[K10] api action=tts status=%d\n", status);
            http.end();
            return "";
        }
        JsonDocument response;
        DeserializationError error = deserializeJson(response, http.getStream());
        http.end();
        String audioUrl = error ? "" : String(response["data"]["audio_url"] | "");
        Serial.printf("[K10] api action=tts result=%s audio_url_bytes=%u\n", error ? error.c_str() : "ok", audioUrl.length());
        return audioUrl;
    }

private:
    const String& _deviceId;
    const String& _token;

    StreamResult stream(const char* path, const String& body) {
        StreamResult result;
        SseClient client;
        if (!client.connectPost(String(SERVER_HOST) + path, body, _deviceId, _token)) {
            Serial.println("[K10] api action=stream result=connect-failed");
            return result;
        }

        return readStream(client);
    }

    StreamResult readStream(SseClient& client) {
        StreamResult result;
        unsigned long lastData = millis();
        while (millis() - lastData < TOTAL_STREAM_TIMEOUT_MS) {
            SseEvent event;
            if (!client.readEventBlocking(event, 3000)) {
                if (!client.isConnected()) break;
                continue;
            }
            lastData = millis();
            switch (event.type) {
                case SSE_ASR_RESULT: result.transcript = event.userText; break;
                case SSE_TEXT: result.text += event.content; break;
                case SSE_AUDIO: result.audioUrl = event.content; break;
                case SSE_COMPLETE:
                    if (event.fullText.length()) result.text = event.fullText;
                    result.success = result.text.length() > 0;
                    Serial.printf("[K10] api action=stream event=complete text_chars=%u audio_url_bytes=%u\n", result.text.length(), result.audioUrl.length());
                    client.disconnect();
                    return result;
                case SSE_ERROR:
                    Serial.printf("[K10] api action=stream event=error message_bytes=%u\n", event.errorMsg.length());
                    client.disconnect();
                    return result;
                default: break;
            }
        }
        client.disconnect();
        Serial.println("[K10] api action=stream result=timeout-or-disconnect");
        return result;
    }

    String jsonEscape(const String& value) {
        String escaped;
        escaped.reserve(value.length() + 8);
        for (size_t index = 0; index < value.length(); index++) {
            const char c = value[index];
            switch (c) {
                case '"': escaped += "\\\""; break;
                case '\\': escaped += "\\\\"; break;
                case '\n': escaped += "\\n"; break;
                case '\r': escaped += "\\r"; break;
                case '\t': escaped += "\\t"; break;
                default: escaped += c; break;
            }
        }
        return escaped;
    }
};
