/*
 * RGB LED 灯效管理器 - 非阻塞状态机
 * K10 板载 RGB LED，通过 k10.rgb->brightness() + k10.rgb->write(-1, color) 控制
 * 搬运自 code-project-14
 */

#ifndef LED_EFFECT_H
#define LED_EFFECT_H

#include <Arduino.h>
#include "unihiker_k10.h"

// ==================== 状态颜色定义（0xRRGGBB）====================
#define C_BOOT        0x003296   // BOOT 开机: (0,50,150)
#define C_IDLE        0x001E50   // IDLE 待机: (0,30,80)
#define C_WAKING      0x6450FF   // WAKING 唤醒: (100,80,255)
#define C_CAPTURING   0xFFFFFF   // CAPTURING 拍照: (255,255,255)
#define C_AI_PROC     0x0064FF   // AI处理: (0,100,255)
#define C_COMPLIMENT  0xFFB464   // 夸奖/对话输出: (255,180,100)
#define C_LISTENING   0x00783C   // 对话倾听/录音: (0,120,60)
#define C_OFFLINE     0xFF9600   // 离线兜底: (255,150,0)
#define C_ERROR       0xFF0000   // 错误: (255,0,0)

// ==================== 设备状态枚举 ====================
enum LedState {
    ST_BOOT,              // 开机 - 蓝色呼吸
    ST_IDLE,              // 待机 - 微弱呼吸
    ST_WAKING,            // 唤醒 - 蓝白渐亮
    ST_CAPTURING,         // 拍照 - 白色稳定亮
    ST_AI_PROCESSING,     // AI处理 - 蓝色闪烁
    ST_COMPLIMENT_OUTPUT, // 夸奖输出 - 暖黄色稳定亮
    ST_DIALOG_LISTENING,  // 对话倾听/录音 - 绿色稳定亮
    ST_DIALOG_OUTPUT,     // 对话输出 - 暖黄呼吸
    ST_OFFLINE_FALLBACK,  // 离线兜底 - 橙色慢闪
    ST_ERROR,             // 错误 - 红色快闪
    ST_OFF                // 灭灯
};

// ==================== 灯效类型 ====================
enum LedEffectType {
    FX_BREATH,    // 呼吸灯
    FX_BLINK,     // 闪烁
    FX_STEADY,    // 稳定亮
    FX_FADE_IN,   // 渐亮
    FX_FADE_OUT,  // 渐暗
    FX_OFF        // 灭
};

// ==================== 状态配置结构 ====================
struct LedConfig {
    uint32_t color;
    LedEffectType fx;
    uint16_t periodMs;
    uint8_t maxBrightness;
};

// ==================== LED 灯效管理器 ====================
class LedEffectManager {
public:
    LedEffectManager(UNIHIKER_K10* k10Ptr) : _k10(k10Ptr), _state(ST_OFF) {
        _lastUpdate = 0;
        _phase = 0;
        _breathDir = 1;
        _blinkOn = false;
        _fadeLevel = 0;
    }

    void setState(LedState s) {
        if (_state == s) return;
        _state = s;
        _phase = 0;
        _breathDir = 1;
        _blinkOn = false;
        _fadeLevel = 0;
        _lastLoggedState = ST_OFF;  // 强制下次 writeLed 打印
        _lastUpdate = millis();
        applyConfig();
    }

    void update() {
        if (_state == ST_OFF) return;

        unsigned long now = millis();
        unsigned long elapsed = now - _lastUpdate;

        switch (_cfg.fx) {
            case FX_BREATH: {
                uint16_t stepMs = _cfg.periodMs / (_cfg.maxBrightness * 2);
                if (elapsed >= stepMs) {
                    _phase += _breathDir;
                    if (_phase >= _cfg.maxBrightness) { _phase = _cfg.maxBrightness; _breathDir = -1; }
                    if (_phase <= 0) { _phase = 0; _breathDir = 1; }
                    _lastUpdate = now;
                    writeLed(_cfg.color, (uint8_t)_phase);
                }
                break;
            }
            case FX_BLINK: {
                if (elapsed >= _cfg.periodMs / 2) {
                    _blinkOn = !_blinkOn;
                    _lastUpdate = now;
                    writeLed(_blinkOn ? _cfg.color : 0x000000, _blinkOn ? _cfg.maxBrightness : 0);
                }
                break;
            }
            case FX_STEADY:
                break;
            case FX_FADE_IN: {
                if (_fadeLevel < _cfg.maxBrightness && elapsed > 100) {
                    _fadeLevel++;
                    _lastUpdate = now;
                    writeLed(_cfg.color, (uint8_t)_fadeLevel);
                }
                break;
            }
            case FX_FADE_OUT: {
                if (_fadeLevel < _cfg.maxBrightness && elapsed > 150) {
                    _fadeLevel++;
                    _lastUpdate = now;
                    writeLed(_cfg.color, (uint8_t)(_cfg.maxBrightness - _fadeLevel));
                }
                break;
            }
            case FX_OFF:
                writeLed(0x000000, 0);
                break;
        }
    }

private:
    UNIHIKER_K10* _k10;
    LedState _state;
    LedConfig _cfg;
    unsigned long _lastUpdate;
    int _phase;
    int _breathDir;
    bool _blinkOn;
    int _fadeLevel;
    LedState _lastLoggedState = ST_OFF;  // 诊断用

    void applyConfig() {
        switch (_state) {
            case ST_BOOT:              _cfg = {C_BOOT,        FX_BREATH, 2000, 9}; break;
            case ST_IDLE:              _cfg = {C_IDLE,        FX_BREATH, 2000, 3}; break;
            case ST_WAKING:            _cfg = {C_WAKING,      FX_FADE_IN, 1000, 9}; break;
            case ST_CAPTURING:         _cfg = {C_CAPTURING,   FX_STEADY, 0, 9};    break;
            case ST_AI_PROCESSING:     _cfg = {C_AI_PROC,     FX_BLINK, 500, 9};   break;
            case ST_COMPLIMENT_OUTPUT: _cfg = {C_COMPLIMENT,  FX_STEADY, 0, 8};    break;
            case ST_DIALOG_LISTENING:  _cfg = {C_LISTENING,   FX_STEADY, 0, 8};    break;
            case ST_DIALOG_OUTPUT:     _cfg = {C_COMPLIMENT,  FX_BREATH, 2000, 8}; break;
            case ST_OFFLINE_FALLBACK:  _cfg = {C_OFFLINE,     FX_BLINK, 1000, 8};  break;
            case ST_ERROR:             _cfg = {C_ERROR,       FX_BLINK, 250, 9};   break;
            case ST_OFF:               _cfg = {0x000000,      FX_OFF, 0, 0};       break;
            default:                   _cfg = {0x000000,      FX_OFF, 0, 0};       break;
        }

        if (_cfg.fx == FX_STEADY) writeLed(_cfg.color, _cfg.maxBrightness);
        else if (_cfg.fx == FX_OFF) writeLed(0x000000, 0);
    }

    void writeLed(uint32_t color, uint8_t brightness) {
        _k10->rgb->brightness(brightness);
        _k10->rgb->write(-1, color);
        // 诊断打印（仅状态切换时，避免刷屏）
        if (_state != _lastLoggedState) {
            _lastLoggedState = _state;
            Serial.printf("[LED] state=%d color=0x%06X bright=%d\n", _state, color, brightness);
        }
    }
};

#endif // LED_EFFECT_H
