/*
 * hug_voice.h — 抱抱文案语音播报 (ticket 07)
 *
 * 播放构建期预生成的语音(阿里 TTS,8 句 PCM16 mono 16kHz,存 flash):
 * 文字淡入瞬间 startSpeaking(),update() 每帧推小块到板载立体声 I2S,
 * 不阻塞动画;hug_tts_audio.h 由 scripts/capture_hug_audio.py 生成。
 * 音频缺失 → 静默降级,动画与文字照常。
 */

#ifndef HUG_VOICE_H
#define HUG_VOICE_H

#include <Arduino.h>
#include "unihiker_k10.h"     // xI2SMutex, I2S
#include "config.h"
#include "hug_tts_audio.h"

class HugVoice {
public:
    HugVoice() : _lineIdx(-1), _playing(false), _pos(0) {}

    void begin() {
        _ready = true;
        Serial.println("[HUGVOICE] pcm player ready");
    }

    bool ready() const { return _ready; }

    // 预记当前句
    void prepare(int lineIdx) {
        if (lineIdx < 0 || lineIdx >= HUG_COMFORT_LINES_COUNT) return;
        _lineIdx = lineIdx;
        _playing = false;
        _pos = 0;
        Serial.printf("[HUGVOICE] prepared idx=%d bytes=%u\n",
                      lineIdx, HUG_TTS_LINES[lineIdx].len);
    }

    // 文字淡入瞬间:开始流式播放(下一帧 update 出第一块)
    void startSpeaking() {
        if (!_ready || _lineIdx < 0) return;
        _playing = true;
        _pos = 0;
        Serial.println("[HUGVOICE] speak start");
    }

    void stop() { _playing = false; }

    // 每帧推 2 块(每块 512B mono ≈ 16ms 音频),与动画循环同帧率
    void update() {
        if (!_ready || !_playing || _lineIdx < 0) return;
        const uint8_t* pcm = HUG_TTS_LINES[_lineIdx].pcm;
        uint32_t len = HUG_TTS_LINES[_lineIdx].len;
        for (int b = 0; b < 2 && _pos < len; b++) {
            uint32_t chunk = len - _pos < 512 ? len - _pos : 512;
            if (!writeStereo(pcm + _pos, chunk)) {
                _playing = false;
                Serial.println("[HUGVOICE] i2s stall, stopped");
                return;
            }
            _pos += chunk;
        }
        if (_pos >= len) {
            _playing = false;
            Serial.println("[HUGVOICE] done");
        }
    }

private:
    bool _ready = false;
    int _lineIdx;
    bool _playing;
    uint32_t _pos;

    // 板载 I2S 为立体声配置:单声道样本复制到左右通道(与 media.h 播放一致)
    bool writeStereo(const uint8_t* mono, size_t bytes) {
        int16_t stereo[512];
        const int16_t* m = reinterpret_cast<const int16_t*>(mono);
        size_t n = bytes / 2;
        for (size_t i = 0; i < n; i++) stereo[i * 2] = stereo[i * 2 + 1] = m[i];
        size_t w = 0;
        if (xI2SMutex) xSemaphoreTake(xI2SMutex, portMAX_DELAY);
        esp_err_t err = i2s_write(I2S_NUM_0, stereo, n * 4, &w, 200);
        if (xI2SMutex) xSemaphoreGive(xI2SMutex);
        return err == ESP_OK && w > 0;
    }
};

#endif // HUG_VOICE_H