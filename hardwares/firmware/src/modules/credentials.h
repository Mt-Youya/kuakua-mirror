#pragma once

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#include "../config.h"
#include "../server_cert.h"

class CredentialStore {
public:
    bool begin() {
        if (!_opened) {
            _opened = _preferences.begin("k10", false);
            Serial.printf("[K10] credentials nvs_open=%d\n", _opened);
            if (!_opened) return false;
        }
        _deviceId = _preferences.getString("device_id", "");
        _token = _preferences.getString("token", "");
        Serial.printf("[K10] credentials source=nvs device_id_bytes=%u token_bytes=%u\n", _deviceId.length(), _token.length());

        if (strlen(K10_ACTIVATION_CODE)) {
            Serial.println("[K10] credentials source=recovery action=activate");
            return activateAndPersist();
        }
        if (_deviceId.length() && _token.length()) return true;

        _deviceId = K10_BOOTSTRAP_DEVICE_ID;
        _token = K10_BOOTSTRAP_TOKEN;
        if (!_deviceId.length() || !_token.length()) {
            Serial.println("[K10] credentials source=bootstrap result=missing");
            return false;
        }
        Serial.printf("[K10] credentials source=bootstrap action=rotate device_id_bytes=%u token_bytes=%u\n", _deviceId.length(), _token.length());
        if (rotateAndPersist()) return true;
        _deviceId = "";
        _token = "";
        Serial.println("[K10] credentials source=bootstrap result=unavailable");
        return false;
    }

    bool rotateAndPersist() {
        WiFiClientSecure client;
        client.setCACert(K10_SERVER_CA);
        HTTPClient http;
        String url = String(SERVER_HOST) + "/api/v1/devices/" + _deviceId + "/token/rotate";
        if (!http.begin(client, url)) {
            Serial.println("[K10] credentials action=rotate result=http-begin-failed");
            return false;
        }
        http.addHeader("X-Device-ID", _deviceId);
        http.addHeader("Authorization", "Bearer " + _token);
        int status = http.POST("");
        if (status != HTTP_CODE_OK) {
            Serial.printf("[K10] credentials action=rotate status=%d\n", status);
            http.end();
            return false;
        }

        JsonDocument response;
        String responseBody = http.getString();
        http.end();
        DeserializationError error = deserializeJson(response, responseBody);
        String token = response["data"]["token"] | "";
        if (error || !token.length()) {
            Serial.printf("[K10] credentials action=rotate result=%s response_bytes=%u token_bytes=%u\n", error ? error.c_str() : "missing-token", responseBody.length(), token.length());
            return false;
        }

        _token = token;
        // ponytail: NVS is not encrypted; enable ESP32 flash encryption for stronger at-rest protection.
        size_t savedDeviceId = _preferences.putString("device_id", _deviceId);
        size_t savedToken = _preferences.putString("token", _token);
        String storedDeviceId = _preferences.getString("device_id", "");
        String storedToken = _preferences.getString("token", "");
        Serial.printf("[K10] credentials action=rotate saved_device_id_bytes=%u saved_token_bytes=%u readback_device_id_bytes=%u readback_token_bytes=%u\n", savedDeviceId, savedToken, storedDeviceId.length(), storedToken.length());
        return savedDeviceId && savedToken && storedDeviceId == _deviceId && storedToken == _token;
    }

    bool activateAndPersist() {
        WiFiClientSecure client;
        client.setCACert(K10_SERVER_CA);
        HTTPClient http;
        if (!http.begin(client, String(SERVER_HOST) + "/api/v1/devices/activate")) {
            Serial.println("[K10] credentials action=activate result=http-begin-failed");
            return false;
        }

        JsonDocument request;
        request["activationCode"] = K10_ACTIVATION_CODE;
        JsonObject deviceInfo = request["deviceInfo"].to<JsonObject>();
        deviceInfo["model"] = K10_DEVICE_MODEL;
        deviceInfo["serialNumber"] = K10_DEVICE_SERIAL;
        deviceInfo["firmwareVersion"] = K10_FIRMWARE_VERSION;
        deviceInfo["macAddress"] = WiFi.macAddress();

        String body;
        serializeJson(request, body);
        Serial.printf("[K10] credentials action=activate request_bytes=%u\n", body.length());
        http.addHeader("Content-Type", "application/json");
        int status = http.POST(body);
        if (status != HTTP_CODE_OK) {
            Serial.printf("[K10] credentials action=activate status=%d\n", status);
            http.end();
            return false;
        }

        JsonDocument response;
        String responseBody = http.getString();
        http.end();
        DeserializationError error = deserializeJson(response, responseBody);
        if (error) {
            Serial.printf("[K10] credentials action=activate result=json-error:%s response_bytes=%u\n", error.c_str(), responseBody.length());
            return false;
        }

        _deviceId = response["data"]["deviceId"] | "";
        _token = response["data"]["token"] | "";
        if (!_deviceId.length() || !_token.length()) {
            Serial.printf("[K10] credentials action=activate result=missing-response device_id_bytes=%u token_bytes=%u\n", _deviceId.length(), _token.length());
            return false;
        }
        size_t savedDeviceId = _preferences.putString("device_id", _deviceId);
        size_t savedToken = _preferences.putString("token", _token);
        String storedDeviceId = _preferences.getString("device_id", "");
        String storedToken = _preferences.getString("token", "");
        Serial.printf("[K10] credentials action=activate saved_device_id_bytes=%u saved_token_bytes=%u readback_device_id_bytes=%u readback_token_bytes=%u\n", savedDeviceId, savedToken, storedDeviceId.length(), storedToken.length());
        return savedDeviceId && savedToken && storedDeviceId == _deviceId && storedToken == _token;
    }

    bool ready() const { return _deviceId.length() && _token.length(); }
    const String& deviceId() const { return _deviceId; }
    const String& token() const { return _token; }

private:
    Preferences _preferences;
    bool _opened = false;
    String _deviceId;
    String _token;
};
