#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>

#include "unihiker_k10.h"
#include "config.h"
#include "display_stream.h"
#include "hug_player.h"
#include "hug_voice.h"
#include "led_effect.h"
#include "modules/api_client.h"
#include "modules/credentials.h"
#include "modules/media.h"
#ifdef AUDIO_DUMP
#include "hug_audio_dump.h"
#endif

UNIHIKER_K10 k10;
LedEffectManager led(&k10);
MirrorUI screen(&k10);
TypewriterAnim typer;
CredentialStore credentials;
CameraCapture camera;
VoiceRecorder recorder(k10);
HugPlayer hugPlayer;
HugVoice hugVoice;

bool wifiConnected = false;
bool cameraReady = false;
String bootSessionId;
volatile bool buttonADown = false;
volatile unsigned long buttonADownAt = 0;
volatile bool longPressHandled = false;
volatile bool photoRequested = false;
volatile bool voiceRequested = false;
volatile bool buttonBDown = false;
volatile unsigned long buttonBDownAt = 0;
volatile bool hugRequested = false;
volatile bool reconnectRequested = false;

void logEvent(const char* event) {
    Serial.printf("[K10] %lums %s\n", millis(), event);
}

void onButtonAPressed() {
    logEvent("button=A action=pressed");
    buttonADown = true;
    buttonADownAt = millis();
    longPressHandled = false;
}

void onButtonAReleased() {
    const unsigned long heldMs = millis() - buttonADownAt;
    Serial.printf("[K10] %lums button=A action=released held_ms=%lu long=%d\n", millis(), heldMs, longPressHandled);
    if (!longPressHandled) photoRequested = true;
    buttonADown = false;
}

void onButtonBPressed() {
    logEvent("button=B action=pressed");
    buttonBDown = true;
    buttonBDownAt = millis();
}

void onButtonBReleased() {
    const unsigned long heldMs = millis() - buttonBDownAt;
    const bool isLongPress = heldMs >= LONG_PRESS_MS;
    Serial.printf("[K10] %lums button=B action=released held_ms=%lu long=%d\n", millis(), heldMs, isLongPress);

    if (isLongPress) {
        reconnectRequested = true;
        logEvent("button=B action=reconnect-requested");
    } else {
        hugRequested = true;
        logEvent("button=B action=short-press-queued");
    }

    buttonBDown = false;
}

bool connectWifi() {
    Serial.printf("[K10] %lums wifi action=connect source=%s\n", millis(), strlen(K10_WIFI_SSID) ? "compile" : "nvs");
    WiFi.mode(WIFI_STA);
    WiFi.disconnect(false, false);
    if (strlen(K10_WIFI_SSID)) {
        WiFi.begin(K10_WIFI_SSID, K10_WIFI_PASSWORD);
    } else {
        WiFi.begin();
    }
    for (int attempt = 0; attempt < WIFI_CONNECT_RETRY && WiFi.status() != WL_CONNECTED; attempt++) delay(500);
    wifiConnected = WiFi.status() == WL_CONNECTED;
    Serial.printf("[K10] %lums wifi result=%s status=%d\n", millis(), wifiConnected ? "connected" : "failed", WiFi.status());
    return wifiConnected;
}

String makeBootSessionId() {
    uint8_t mac[6];
    WiFi.macAddress(mac);
    char session[32];
    snprintf(session, sizeof(session), "%02x%02x%02x%02x-%08lx", mac[2], mac[3], mac[4], mac[5], esp_random());
    return String(session);
}

void returnToIdle() {
    led.setState(ST_IDLE);
    screen.drawStandby(wifiConnected);
}

void showFailure(const char* message) {
    Serial.printf("[K10] %lums result=failure screen=%s\n", millis(), message);
    led.setState(ST_ERROR);
    screen.drawError(message);
    delay(1800);
    returnToIdle();
}

bool onlineAndProvisioned() {
    if (!wifiConnected && !connectWifi()) {
        showFailure("网络未连接");
        return false;
    }
    if (!credentials.ready() && !credentials.begin()) {
        logEvent("credentials result=unavailable");
        showFailure("未配置设备凭证");
        return false;
    }
    logEvent("credentials result=ready");
    return true;
}

void present(StreamResult result) {
    Serial.printf("[K10] %lums stream success=%d text_chars=%u audio=%d\n", millis(), result.success, result.text.length(), result.audioUrl.length() > 0);
    if (!result.success) {
        showFailure("服务暂不可用");
        return;
    }

    led.setState(ST_COMPLIMENT_OUTPUT);
    screen.praiseStart(false);
    typer.start(result.text);
    while (!typer.isDone()) {
        screen.uiTick(typer);
        delay(10);
    }
    screen.uiTick(typer);

    K10ApiClient api(credentials.deviceId(), credentials.token());
    String audioUrl = result.audioUrl.length() ? result.audioUrl : api.synthesize(result.text);
    if (!audioUrl.length() || !recorder.downloadAndPlay(audioUrl, credentials.deviceId(), credentials.token())) {
        logEvent("audio result=failed");
        showFailure("语音播放失败");
        return;
    }
    logEvent("audio result=played");
    delay(RESPONSE_HOLD_MS);
    returnToIdle();
}

void runPhotoInteraction() {
    logEvent("photo action=start");
    if (!cameraReady) {
        showFailure("相机初始化失败");
        return;
    }
    if (!onlineAndProvisioned()) return;

    led.setState(ST_CAPTURING);
    screen.drawCapture();
    String imageBase64;
    if (!camera.captureBase64(imageBase64)) {
        showFailure("拍照失败");
        return;
    }
    Serial.printf("[K10] %lums photo result=captured base64_bytes=%u\n", millis(), imageBase64.length());

    led.setState(ST_AI_PROCESSING);
    screen.drawThinking();
    K10ApiClient api(credentials.deviceId(), credentials.token());
    present(api.praise(imageBase64));
}

void runVoiceConversation() {
    logEvent("voice action=start");
    if (!onlineAndProvisioned()) return;

    led.setState(ST_DIALOG_LISTENING);
    screen.drawThinking();
    uint8_t* wav = nullptr;
    size_t wavSize = 0;
    if (!recorder.recordWav(wav, wavSize)) {
        showFailure("录音失败");
        return;
    }
    Serial.printf("[K10] %lums voice result=recorded wav_bytes=%u\n", millis(), wavSize);

    led.setState(ST_AI_PROCESSING);
    K10ApiClient api(credentials.deviceId(), credentials.token());
    StreamResult result = api.chat(wav, wavSize, bootSessionId);
    free(wav);
    present(result);
}

void setup() {
    Serial.begin(115200);
    delay(500);
    logEvent("boot action=start");
    Wire.begin(47, 48);
    k10.begin();
    k10.initScreen(0);  // 0 = 竖屏 0°（相对原 dir=2 为 180° 上下颠倒，纯旋转非镜像）
    k10.creatCanvas();
    k10.setScreenBackground(COL_BG);
    screen.begin();
    led.setState(ST_BOOT);

    k10.buttonA->setPressedCallback(onButtonAPressed);
    k10.buttonA->setUnPressedCallback(onButtonAReleased);
    k10.buttonB->setPressedCallback(onButtonBPressed);
    k10.buttonB->setUnPressedCallback(onButtonBReleased);

    cameraReady = camera.begin();
    Serial.printf("[K10] %lums camera result=%s\n", millis(), cameraReady ? "ready" : "failed");
    recorder.begin();
    logEvent("audio result=ready");
    hugVoice.begin();
    connectWifi();
    if (wifiConnected) {
        bool credentialReady = credentials.begin();
        Serial.printf("[K10] %lums credentials boot_result=%s ready=%d\n", millis(), credentialReady ? "ready" : "unavailable", credentials.ready());
    }
    bootSessionId = makeBootSessionId();
    logEvent("boot result=ready");
    returnToIdle();
}

void loop() {
    led.update();
#ifdef AUDIO_DUMP
    // 临时导出模式:PC 端发送 "GO" → 设备用自身凭证合成 8 句并经串口回传
    if (Serial.available()) {
        String cmd = Serial.readString();
        cmd.trim();
        if (cmd.startsWith("GO") && onlineAndProvisioned()) {
            K10ApiClient api(credentials.deviceId(), credentials.token());
            dumpAllLines(api, credentials);
        }
    }
#endif
    if (hugPlayer.active()) {
        int entered = hugPlayer.takePhaseEntered();
        if (entered == HP_PHASE_HOLD) hugVoice.startSpeaking();  // 文字淡入瞬间开嗓
        if (hugPlayer.tick()) {   // 返回 true = 动画结束
            hugVoice.stop();
            logEvent("hug action=complete");
            returnToIdle();
        }
        hugVoice.update();
        delay(1);
        return;
    }
    if (hugRequested) {
        hugRequested = false;
        led.setState(ST_HUG);
        hugPlayer.start();
        hugVoice.prepare(hugPlayer.currentLineIndex());  // 预解析同一句(GBK),淡入瞬间零延迟开嗓
        logEvent("hug action=start");
    }
    if (buttonADown && !longPressHandled && millis() - buttonADownAt >= LONG_PRESS_MS) {
        longPressHandled = true;
        voiceRequested = true;
        logEvent("button=A action=long-press-queued");
    }
    if (reconnectRequested) {
        reconnectRequested = false;
        connectWifi();
        if (wifiConnected) {
            bool credentialReady = credentials.begin();
            Serial.printf("[K10] %lums credentials reconnect_result=%s ready=%d\n", millis(), credentialReady ? "ready" : "unavailable", credentials.ready());
        }
        returnToIdle();
    }
    if (voiceRequested) {
        voiceRequested = false;
        runVoiceConversation();
    }
    if (photoRequested) {
        photoRequested = false;
        logEvent("button=A action=short-press-queued");
        runPhotoInteraction();
    }
    delay(10);
}
