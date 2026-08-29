/*
 * display_stream.h — 夸夸镜 MirrorUI 模块 (v6 瓷白银线画廊风)
 *
 * 复用旧文件名装新 UI 模块（main.cpp 已 include 它）。
 * 职责：调色板常量已在 config.h，本文件负责月亮绘制 + 每页布局 + 打字机 + 局部动效
 *       + 抱抱动效（月牙合拢成满月 = 拥抱的隐喻）。
 *
 * 设计原则：
 *   - 全屏只在页面切换时重绘一次，loop 里只做局部重绘（呼吸点/光标/声波/抱抱）
 *   - 月亮是重图形，只在页面切换时画一次，绝不放进 loop（抱抱变形除外，局部重绘）
 *   - 动效白名单：呼吸点(≥800ms) / 声波(≥300ms 预留) / 打字机逐字+光标(80~120ms)
 *                  / 抱抱月牙→满月变形(≥140ms 每步)
 *   - 月亮在非抱抱状态下无表情变化、无动画——静态就是高级
 */

#ifndef DISPLAY_STREAM_H
#define DISPLAY_STREAM_H

#include <Arduino.h>
#include "unihiker_k10.h"
#include <math.h>

// ==================== 屏幕尺寸 ====================
#define SCR_W 240
#define SCR_H 320

// ======================================================================
// 月亮轮廓坐标 — 从参考图程序描摹所得 (IoU 0.9904)
// 200×200 画布，y 向下，沿轮廓有序排列
// 坐标范围 0~200，绘制时按 drawMoon(x,y,size) 等比缩放
// ======================================================================
// 月牙轮廓：外缘（右半弧，从顶到底）→ 内缘（左半弧，从底回顶）
// 构成单一连通多边形，扫描线填充自然产生月牙形状
// 200×200 画布，y 向下
static const int16_t MOON_POLY[][2] = {
    // 经典几何月牙：两个圆弧的差集
    // 外弧：圆心(100,80)，半径80，取右半弧（从顶到底）
    // 内弧：圆心(120,80)，半径75，取左半弧（从底回顶）
    // 两圆相交于上下两个尖角点，自然形成两端尖尖的月牙
    // 两圆心在同一水平线 y=80 → 上下完全对称
    // 外弧从顶到底（18点）
    {100,  0},
    {112,  1}, {124,  5}, {134, 12}, {142, 22}, {148, 35},
    {152, 50}, {154, 65}, {155, 80}, {154, 95}, {152,110},
    {148,125}, {142,138}, {134,148}, {124,155}, {112,159},
    {100,160},
    // 内弧从底回顶（圆心右移20px，半径75）
    // 交点在 y≈0 和 y≈160 附近，形成尖角
    {108,159}, {117,155}, {126,148}, {134,138}, {141,125},
    {146,110}, {149, 95}, {150, 80}, {149, 65}, {146, 50},
    {141, 35}, {134, 22}, {126, 12}, {117,  5}, {108,  1},
    // 闭合回起点
    {100,  0}
};
#define MOON_POLY_COUNT (sizeof(MOON_POLY) / sizeof(MOON_POLY[0]))

// 闭眼线折线（200 画布坐标）
static const int16_t EYE_LINE[][2] = {
    {52, 82}, {57, 86}, {62, 87}, {66, 83}
};
#define EYE_LINE_COUNT (sizeof(EYE_LINE) / sizeof(EYE_LINE[0]))

// ======================================================================
// UTF-8 安全打字机
// ======================================================================
class TypewriterAnim {
public:
    TypewriterAnim() : _charIndex(0), _lastCharTime(0), _done(false), _totalChars(0) {}

    void start(const String& text, uint16_t intervalMs = STREAM_CHAR_DELAY) {
        _text = text;
        _charIndex = 0;
        _lastCharTime = millis();
        _intervalMs = intervalMs;
        _done = false;
        _totalChars = countUtf8Chars(text);
    }

    String update() {
        if (_done) return _text;
        unsigned long now = millis();
        if (now - _lastCharTime >= _intervalMs) {
            _lastCharTime = now;
            _charIndex++;
            if (_charIndex >= _totalChars) {
                _charIndex = _totalChars;
                _done = true;
            }
        }
        return utf8Prefix(_text, _charIndex);
    }

    bool isDone() const { return _done; }
    String getFullText() const { return _text; }
    int getCharIndex() const { return _charIndex; }
    int getTotalChars() const { return _totalChars; }

private:
    String _text;
    int _charIndex;
    unsigned long _lastCharTime;
    uint16_t _intervalMs;
    bool _done;
    int _totalChars;

    int countUtf8Chars(const String& s) {
        int count = 0, len = s.length(), i = 0;
        while (i < len) {
            uint8_t c = (uint8_t)s[i];
            if (c >= 0xF0) i += 4;
            else if (c >= 0xE0) i += 3;
            else if (c >= 0xC0) i += 2;
            else i += 1;
            count++;
        }
        return count;
    }

    String utf8Prefix(const String& s, int nChars) {
        int byteIdx = 0, charCount = 0, len = s.length();
        while (byteIdx < len && charCount < nChars) {
            uint8_t c = (uint8_t)s[byteIdx];
            int charLen = 1;
            if (c >= 0xF0) charLen = 4;
            else if (c >= 0xE0) charLen = 3;
            else if (c >= 0xC0) charLen = 2;
            byteIdx += charLen;
            charCount++;
        }
        return s.substring(0, byteIdx);
    }
};

// ======================================================================
// MirrorUI — 主 UI 模块
// ======================================================================
class MirrorUI {
public:
    MirrorUI(UNIHIKER_K10* k10Ptr) : _k10(k10Ptr) {
        _currentPage = 255;
        _lastAnimTime = 0;
        _breathOn = false;
        _lastBreathTime = 0;
        _praiseActive = false;
        _praiseDone = false;
        _lastPraiseText = "";
        _lastPraiseChars = 0;
        _cursorVisible = false;
        // 抱抱动效初始化
        _hugActive = false;
        _hugPhase = 0;
        _hugStep = 0;
        _hugStartTime = 0;
        _hugLastStepTime = 0;
        _hugFatness = 0;
        _hugTextIndex = 0;
        _hugLastTextTime = 0;
        _hugTextDone = false;
        _hugTextPhase = 0;   // 0=GREY, 1=INK
        _hugHaloStep = 0;
        _hugLastHaloTime = 0;
        _moonCentX = 0;
        _moonCentY = 0;
        _moonRAvg = 0;
        _moonInit = false;
    }

    // ==================== 初始化 ====================
    void begin() {
        _currentPage = 255;
        // 预计算月亮质心和平均半径（只算一次）
        initMoonGeometry();
        // 开机页
        drawBoot();
    }

    // ==================== 页面切换标记 ====================
    void setPage(uint8_t page) {
        if (_currentPage != page) {
            _currentPage = page;
            _praiseActive = false;
        }
    }

    // ==================== P0 开机页 ====================
    void drawBoot() {
        _currentPage = 0;
        _k10->canvas->canvasClear();
        _k10->setScreenBackground(COL_BG);
        // 大银月
        drawMoon(52, 26, 136);
        // 标题
        drawTextSpaced("夸夸镜", SCR_W/2, 216, COL_INK, 30, 8);
        // 副标题
        drawTextSpaced("K U A K U A M I R R O R", SCR_W/2, 248, COL_DIM, 16, 2);
        _k10->canvas->updateCanvas();
    }

    // ==================== P1 待机页 ====================
    void drawStandby(bool wifiOk) {
        _currentPage = 1;
        _k10->canvas->canvasClear();
        _k10->setScreenBackground(COL_BG);
        // 细月亮
        drawMoon(76, 28, 92);
        // 两行提示
        drawTextCentered("对我说说话", 198, COL_INK, 24);
        drawTextCentered("或短按A拍照", 232, COL_INK, 24);
        // 底部细线
        drawHairline(SCR_W/2, 272, 60);
        // WiFi 状态
        if (wifiOk) {
            drawTextRight("在线", 232, 300, COL_DIM, 16);
        } else {
            drawTextRight("离线模式 · 依然在", 232, 300, COL_DIM, 16);
        }
        _k10->canvas->updateCanvas();
    }

    // ==================== P3 拍照页 ====================
    void drawCapture() {
        _currentPage = 3;
        _k10->canvas->canvasClear();
        _k10->setScreenBackground(COL_BG);
        drawMoon(76, 30, 92);
        // 月亮右上侧雾蓝小点+光晕
        _k10->canvas->canvasCircle(178, 52, 6, COL_ACCENT, COL_ACCENT, true);
        _k10->canvas->canvasCircle(178, 52, 4, COL_BG, COL_BG, true);
        _k10->canvas->canvasCircle(178, 52, 3, COL_ACCENT, COL_ACCENT, true);
        // 文案
        drawTextCentered("让我认真看看你", 206, COL_INK, 24);
        _k10->canvas->updateCanvas();
    }

    // ==================== P4 处理中页 ====================
    void drawThinking() {
        _currentPage = 4;
        _k10->canvas->canvasClear();
        _k10->setScreenBackground(COL_BG);
        drawMoon(76, 28, 92);
        // 雾蓝小点（初始暗态，uiTick 里做呼吸）
        _breathOn = false;
        _lastBreathTime = millis();
        _k10->canvas->canvasCircle(176, 54, 4, COL_ACCENT_DARK, COL_ACCENT_DARK, true);
        // 文案
        drawTextCentered("正在想怎么夸你", 208, COL_GREY, 24);
        _k10->canvas->updateCanvas();
    }

    // ==================== P5/P6 夸夸显示 — 铭牌版式 ====================
    // praiseStart: 进入夸夸页时调用一次（整屏重绘 + 初始化打字机区域）
    void praiseStart(bool offline) {
        _currentPage = offline ? 6 : 5;
        _praiseActive = true;
        _praiseDone = false;
        _lastPraiseText = "";
        _lastPraiseChars = 0;
        _cursorVisible = true;

        _k10->canvas->canvasClear();
        _k10->setScreenBackground(COL_BG);
        // 顶部细线
        drawHairline(SCR_W/2, 38, 40);
        // 小月亮
        drawMoon(94, 46, 58);
        // 底部细线
        drawHairline(SCR_W/2, 230, 60);
        // 铭牌
        drawTextSpaced("KUA KUA MIRROR", SCR_W/2, 252, COL_DIM, 16, 2);
        _k10->canvas->updateCanvas();
    }

    // praiseAddChar: 打字机逐字上屏（局部重绘）
    void praiseAddChar(const String& fullText, bool offline) {
        if (!_praiseActive) return;
        uint32_t textColor = offline ? COL_OFFLINE_TEXT : COL_INK;

        // 擦除文字区域（瓷白底覆盖）
        _k10->canvas->canvasRectangle(20, 160, 200, 60, COL_BG, COL_BG, true);

        // 自动换行（最多两行）
        int maxCharsPerLine = 8;
        int lineHeight = 36;
        int startY = 170;
        int y = startY;
        int len = fullText.length();
        int lineStart = 0;
        int charCount = 0;

        for (int i = 0; i <= len; i++) {
            if (i == len || charCount >= maxCharsPerLine) {
                String line = fullText.substring(lineStart, i);
                drawTextCentered(line.c_str(), y, textColor, 24);
                y += lineHeight;
                lineStart = i;
                charCount = 0;
                if (y > startY + lineHeight) break; // 最多两行
            }
            if (i < len) {
                uint8_t c = (uint8_t)fullText[i];
                if (c >= 0xE0) i += 2;
                charCount++;
            }
        }

        // 光标竖条（流式期间显示）
        if (_cursorVisible && !offline) {
            // 光标位置：当前文字末尾右侧
            int lastLineChars = charCount; // 最后一次未换行的 charCount
            // 重新计算最后一行的字符数
            int remainChars = 0;
            int idx = lineStart;
            while (idx < len) {
                uint8_t c = (uint8_t)fullText[idx];
                if (c >= 0xE0) idx += 3;
                else if (c >= 0xC0) idx += 2;
                else idx += 1;
                remainChars++;
            }
            int cursorX = SCR_W/2 + remainChars * 12; // 中文24号字宽约24，半宽12
            int cursorY = y - lineHeight;
            _k10->canvas->canvasRectangle(cursorX, cursorY, 5, 28, COL_ACCENT, COL_ACCENT, true);
        }

        _lastPraiseText = fullText;
        _k10->canvas->updateCanvas();
    }

    // praiseComplete: 打字机完成，光标消失
    void praiseComplete(bool offline) {
        _praiseDone = true;
        _cursorVisible = false;
        if (!_praiseActive) return;
        uint32_t textColor = offline ? COL_OFFLINE_TEXT : COL_INK;

        // 擦除文字区域重画一次（去掉光标）
        _k10->canvas->canvasRectangle(20, 160, 200, 60, COL_BG, COL_BG, true);

        int maxCharsPerLine = 8;
        int lineHeight = 36;
        int startY = 170;
        int y = startY;
        int len = _lastPraiseText.length();
        int lineStart = 0;
        int charCount = 0;

        for (int i = 0; i <= len; i++) {
            if (i == len || charCount >= maxCharsPerLine) {
                String line = _lastPraiseText.substring(lineStart, i);
                drawTextCentered(line.c_str(), y, textColor, 24);
                y += lineHeight;
                lineStart = i;
                charCount = 0;
                if (y > startY + lineHeight) break;
            }
            if (i < len) {
                uint8_t c = (uint8_t)_lastPraiseText[i];
                if (c >= 0xE0) i += 2;
                charCount++;
            }
        }
        _k10->canvas->updateCanvas();
    }

    // ==================== P7 错误页 ====================
    void drawError(const char* errMsg) {
        _currentPage = 7;
        _k10->canvas->canvasClear();
        _k10->setScreenBackground(COL_BG);
        drawMoon(76, 30, 92);
        drawTextCentered(errMsg, 206, COL_ERR, 24);
        _k10->canvas->updateCanvas();
    }

    // ==================== uiTick — 挂进 loop，只做局部重绘动效 ====================
    void uiTick(TypewriterAnim& typer) {
        unsigned long now = millis();

        // P4 处理中：雾蓝小点呼吸（≥800ms 亮暗交替）
        if (_currentPage == 4) {
            if (now - _lastBreathTime >= 800) {
                _lastBreathTime = now;
                _breathOn = !_breathOn;
                // 局部重绘：只擦+画小点区域
                _k10->canvas->canvasRectangle(170, 48, 12, 12, COL_BG, COL_BG, true);
                if (_breathOn) {
                    _k10->canvas->canvasCircle(176, 54, 4, COL_ACCENT, COL_ACCENT, true);
                } else {
                    _k10->canvas->canvasCircle(176, 54, 4, COL_ACCENT_DARK, COL_ACCENT_DARK, true);
                }
                _k10->canvas->updateCanvas();
            }
        }

        // P5/P6 夸夸页：打字机逐字 + 光标
        if (_praiseActive && !_praiseDone) {
            String shown = typer.update();
            if (typer.getCharIndex() != _lastPraiseChars) {
                _lastPraiseChars = typer.getCharIndex();
                bool isOffline = (_currentPage == 6);
                praiseAddChar(shown, isOffline);
            }
            if (typer.isDone() && !_praiseDone) {
                bool isOffline = (_currentPage == 6);
                praiseComplete(isOffline);
            }
        }
    }

    // ==================== 旧接口兼容（收编进新模块）====================
    void clear() { _currentPage = 255; }

    // 旧 renderIdle → drawStandby
    void renderIdle(unsigned long now, bool wifiOk) {
        if (_currentPage != 1) drawStandby(wifiOk);
    }
    // 旧 renderCapturing → drawCapture
    void renderCapturing(unsigned long now) {
        if (_currentPage != 3) drawCapture();
    }
    // 旧 renderCompliment → praiseStart + uiTick
    void renderCompliment(TypewriterAnim& typer) {
        if (_currentPage != 5) praiseStart(false);
        uiTick(typer);
    }
    // 旧 renderOffline → praiseStart(offline=true) + uiTick
    void renderOffline(TypewriterAnim& typer) {
        if (_currentPage != 6) praiseStart(true);
        uiTick(typer);
    }

    // ==================== 旧抱抱接口（兼容，外部调用）====================
    void drawHug(const char* comfortText) {
        _currentPage = 99;
        _k10->canvas->canvasClear();
        _k10->setScreenBackground(COL_BG);
        drawMoon(76, 28, 92);
        drawTextCentered(comfortText, 200, COL_INK, 24);
        _k10->canvas->updateCanvas();
    }

    // ==================================================================
    // 抱抱动效（月牙合拢成满月 = 拥抱的隐喻）
    // 非阻塞：hugStart() 初始化，hugTick() 每帧推进，hugIsActive() 查状态
    // 月亮区域 76,28,92 → 屏幕坐标约 76~168, 28~120
    // 动画区域扩展到 56,8,160,160（含光环）
    // ==================================================================

    // 抱抱动效启动（整屏重绘一次底色，后续局部推进）
    void hugStart() {
        if (!_moonInit) initMoonGeometry();
        _hugActive = true;
        _hugPhase = 0;       // 0=合拢 1=停留 2=退场
        _hugStep = 0;
        _hugStartTime = millis();
        _hugLastStepTime = millis();
        _hugFatness = 0;
        _hugTextIndex = 0;
        _hugLastTextTime = millis();
        _hugTextDone = false;
        _hugTextPhase = 0;
        _hugHaloStep = 0;
        _hugLastHaloTime = millis() + HUG_HALO_DELAY; // 落后半拍
        _currentPage = 98;   // 抱抱页标记

        // 整屏重绘一次：瓷白底 + 待机版式（月亮区域后续覆盖）
        _k10->canvas->canvasClear();
        _k10->setScreenBackground(COL_BG);
        // 画待机页的静态元素（文字等，月亮会被变形覆盖）
        drawTextCentered("对我说说话", 198, COL_INK, 24);
        drawTextCentered("或短按A拍照", 232, COL_INK, 24);
        drawHairline(SCR_W/2, 272, 60);
        // 画初始月牙
        drawMoonFat(76, 28, 92, 0, COL_SILVER);
        _k10->canvas->updateCanvas();
    }

    // 抱抱动效每帧推进（挂进 loop，非阻塞）
    // 返回 true = 动画结束，应回待机
    bool hugTick() {
        if (!_hugActive) return false;
        unsigned long now = millis();
        unsigned long elapsed = now - _hugStartTime;

        // ---- 阶段 0：合拢成满月（约 2s，14 步 × 140ms）----
        if (_hugPhase == 0) {
            if (now - _hugLastStepTime >= HUG_STEP_MS) {
                _hugLastStepTime = now;
                _hugStep++;
                // fatness 0→1，带轻微过冲：前 12 步到 1.08，后 2 步回落到 1.0
                if (_hugStep <= 12) {
                    // smoothstep 曲线 + 过冲
                    float t = (float)_hugStep / 12.0f;
                    float smooth = t * t * (3.0f - 2.0f * t); // smoothstep
                    _hugFatness = smooth * 1.08f;
                } else {
                    // 最后 2 步从 1.08 回落到 1.0
                    float t = (float)(_hugStep - 12) / 2.0f;
                    _hugFatness = 1.08f - t * 0.08f;
                }

                // 月色过渡：SILVER → SILVER_LIT
                uint32_t moonColor = lerpColor(COL_SILVER, COL_SILVER_LIT, 
                                               constrain(_hugFatness, 0.0f, 1.0f));

                // 局部重绘月亮 + 光环区域
                redrawHugMoonArea(moonColor);
            }

            // 光环（落后半拍开始）
            if (now >= _hugStartTime + HUG_HALO_DELAY) {
                updateHalo(now);
            }

            // 合拢完成
            if (_hugStep >= 14) {
                _hugPhase = 1;
                _hugStep = 0;
                _hugLastStepTime = now;
                _hugFatness = 1.0f;
                // 画满月柔光同心环
                drawHaloRings();
            }
        }

        // ---- 阶段 1：停留（约 1.8s，满月轻呼吸 + 光环淡出）----
        if (_hugPhase == 1) {
            // 满月轻呼吸：fatness 1.0 ↔ 1.02，周期 1.5s
            if (now - _hugLastStepTime >= HUG_BREATH_MS) {
                _hugLastStepTime = now;
                _hugStep++;
                // 用 sin 近似呼吸
                float breath = 1.0f + 0.02f * sin((_hugStep % 2) * 3.14159f);
                _hugFatness = breath;
                redrawHugMoonArea(COL_SILVER_LIT);
                // 光环渐细淡出
                updateHalo(now);
            }

            // 文案逐字浮现（与合拢并行，合拢过半开始）
            if (elapsed > 1000 && !_hugTextDone) {
                updateHugText(now);
            }

            // 停留结束
            if (elapsed >= 1000 + HUG_HOLD_MS + 1500) { // 合拢2s + 停留1.8s + 文案1.5s
                _hugPhase = 2;
                _hugStep = 0;
                _hugLastStepTime = now;
            }
        }

        // ---- 阶段 2：退场（约 1.4s，10 步 × 140ms）----
        if (_hugPhase == 2) {
            if (now - _hugLastStepTime >= HUG_STEP_MS) {
                _hugLastStepTime = now;
                _hugStep++;
                // fatness 1→0
                float t = (float)_hugStep / 10.0f;
                _hugFatness = 1.0f - t;

                // 文案与细线两档淡出
                uint32_t textColor;
                uint32_t lineColor;
                if (_hugStep <= 5) {
                    textColor = COL_GREY;      // INK → GREY
                    lineColor = COL_HAIRLINE_LIT;
                } else {
                    textColor = COL_BG;         // 消失
                    lineColor = COL_BG;
                }

                // 局部重绘月亮 + 文字区域
                uint32_t moonColor = lerpColor(COL_SILVER_LIT, COL_SILVER, 
                                               constrain(1.0f - _hugFatness, 0.0f, 1.0f));
                redrawHugMoonArea(moonColor);

                // 擦文字区域重画（扩大高度覆盖24号字完整行）
                _k10->canvas->canvasRectangle(20, 180, 200, 50, COL_BG, COL_BG, true);
                if (textColor != COL_BG) {
                    drawTextCentered("抱抱你，辛苦啦", 196, textColor, 24);
                }
                // 细线（扩大擦除范围确保无残影）
                _k10->canvas->canvasRectangle(70, 268, 100, 8, COL_BG, COL_BG, true);
                if (lineColor != COL_BG) {
                    drawHairline(SCR_W/2, 272, 60);
                }
                _k10->canvas->updateCanvas();
            }

            // 退场完成
            if (_hugStep >= 10) {
                _hugActive = false;
                return true; // 通知调用方：动画结束
            }
        }

        return false;
    }

    bool hugIsActive() const { return _hugActive; }

private:
    UNIHIKER_K10* _k10;
    uint8_t _currentPage;
    unsigned long _lastAnimTime;
    unsigned long _lastBreathTime;
    bool _breathOn;
    bool _praiseActive;
    bool _praiseDone;
    String _lastPraiseText;
    int _lastPraiseChars;
    bool _cursorVisible;

    // ---- 抱抱动效状态 ----
    bool _hugActive;
    uint8_t _hugPhase;           // 0=合拢 1=停留 2=退场
    int _hugStep;
    unsigned long _hugStartTime;
    unsigned long _hugLastStepTime;
    float _hugFatness;           // 0=月牙 1=满月
    int _hugTextIndex;
    unsigned long _hugLastTextTime;
    bool _hugTextDone;
    uint8_t _hugTextPhase;      // 0=GREY 1=INK
    int _hugHaloStep;
    unsigned long _hugLastHaloTime;

    // ---- 月亮几何预计算 ----
    int _moonCentX, _moonCentY;  // 质心（200画布坐标）
    int _moonRAvg;               // 平均半径
    bool _moonInit;

    // ==================== 月亮几何预计算 ====================
    void initMoonGeometry() {
        int n = MOON_POLY_COUNT;
        long sumX = 0, sumY = 0;
        for (int i = 0; i < n; i++) {
            sumX += MOON_POLY[i][0];
            sumY += MOON_POLY[i][1];
        }
        _moonCentX = sumX / n;  // ≈103.6
        _moonCentY = sumY / n;  // ≈106.5

        long sumR = 0;
        for (int i = 0; i < n; i++) {
            int dx = MOON_POLY[i][0] - _moonCentX;
            int dy = MOON_POLY[i][1] - _moonCentY;
            sumR += (int)sqrt(dx * dx + dy * dy);
        }
        _moonRAvg = sumR / n;
        _moonInit = true;
    }

    // ==================== 变形月亮绘制（高精度版）====================
    // drawMoonFat(x, y, size, fatness, color)
    // fatness: 0=原月牙, 1=正圆
    // 改进：浮点插值顶点 + 亚像素扫描线填充（消除像素缺失）
    void drawMoonFat(int x, int y, int size, float fatness, uint32_t color) {
        if (!_moonInit) initMoonGeometry();

        int n = MOON_POLY_COUNT;
        float* fpx = (float*)malloc(n * sizeof(float));
        float* fpy = (float*)malloc(n * sizeof(float));
        if (!fpx || !fpy) { free(fpx); free(fpy); return; }

        float scale = (float)size / 200.0f;

        for (int i = 0; i < n; i++) {
            // 原始点到质心的距离（200画布坐标）
            float dx = (float)(MOON_POLY[i][0] - _moonCentX);
            float dy = (float)(MOON_POLY[i][1] - _moonCentY);
            float rOrig = sqrtf(dx * dx + dy * dy);

            // r = lerp(rOrig, rAvg, fatness) — 浮点运算
            float r = rOrig + (_moonRAvg - rOrig) * fatness;

            // 角度不变，新坐标 = 质心 + r * 方向（浮点）
            float newPolyX, newPolyY;
            if (rOrig < 0.5f) {
                newPolyX = (float)_moonCentX;
                newPolyY = (float)_moonCentY;
            } else {
                float ratio = r / rOrig;
                newPolyX = (float)_moonCentX + dx * ratio;
                newPolyY = (float)_moonCentY + dy * ratio;
            }

            // 缩放到屏幕坐标（浮点保留）
            fpx[i] = (float)x + newPolyX * scale;
            fpy[i] = (float)y + newPolyY * scale;
        }

        // 找 y 范围（浮点）
        float minYf = fpy[0], maxYf = fpy[0];
        for (int i = 1; i < n; i++) {
            if (fpy[i] < minYf) minYf = fpy[i];
            if (fpy[i] > maxYf) maxYf = fpy[i];
        }
        int minY = (int)floorf(minYf);
        int maxY = (int)ceilf(maxYf);
        if (minY < 0) minY = 0;
        if (maxY >= SCR_H) maxY = SCR_H - 1;

        // 亚像素扫描线填充：对每行用浮点插值求交点，四舍五入取整
        // 这样比纯整数除法精度高，不会丢像素
        for (int sy = minY; sy <= maxY; sy++) {
            float fy = (float)sy + 0.5f; // 行中心
            float crossingsF[16]; // 最多16个交点（多边形34顶点→最多17对，但实际月牙形状最多4-6个）
            int ncross = 0;

            for (int i = 0; i < n; i++) {
                int j = (i + 1) % n;
                float y1 = fpy[i], y2 = fpy[j];
                float x1 = fpx[i], x2 = fpx[j];

                // 检查边是否跨越扫描线 fy（半开区间，避免顶点重复计算）
                if ((y1 <= fy && y2 > fy) || (y2 <= fy && y1 > fy)) {
                    float denom = y2 - y1;
                    if (fabsf(denom) < 0.001f) continue;
                    float t = (fy - y1) / denom;
                    float crossX = x1 + t * (x2 - x1);
                    if (ncross < 16) crossingsF[ncross++] = crossX;
                }
            }

            // 按 x 排序（插入排序，交点少时高效）
            for (int a = 1; a < ncross; a++) {
                float key = crossingsF[a];
                int b = a - 1;
                while (b >= 0 && crossingsF[b] > key) {
                    crossingsF[b + 1] = crossingsF[b];
                    b--;
                }
                crossingsF[b + 1] = key;
            }

            // 成对填充：四舍五入到整数像素，确保不丢像素
            for (int a = 0; a + 1 < ncross; a += 2) {
                int x1 = (int)lroundf(crossingsF[a]);
                int x2 = (int)lroundf(crossingsF[a + 1]);
                // 确保 x1 <= x2
                if (x1 > x2) { int tmp = x1; x1 = x2; x2 = tmp; }
                if (x1 < 0) x1 = 0;
                if (x2 >= SCR_W) x2 = SCR_W - 1;
                // 用 >= 确保单像素也画
                if (x2 >= x1) {
                    _k10->canvas->canvasLine(x1, sy, x2, sy, color);
                }
            }
        }

        free(fpx);
        free(fpy);
    }

    // ==================== 抱抱局部重绘（扩大擦除区域）====================
    // 擦除月亮+光环区域，重画变形月亮
    // 月亮 76,28,92 → 实际范围约 76~168, 28~120
    // 光环最大到 moonR+34 = 80 → 中心 122,74 → 42~202, -6~154
    // 擦除区域扩大到 40,0, 200,170 确保覆盖
    void redrawHugMoonArea(uint32_t moonColor) {
        // 擦除月亮+光环区域（扩大到确保覆盖所有变形和光环像素）
        _k10->canvas->canvasRectangle(40, 0, 200, 170, COL_BG, COL_BG, true);
        // 重画变形月亮
        drawMoonFat(76, 28, 92, _hugFatness, moonColor);
        // 如果有光环步骤，重画当前光环
        if (_hugHaloStep > 0 && _hugPhase < 2) {
            drawHaloStatic();
        }
        _k10->canvas->updateCanvas();
    }

    // ==================== 光环静态重绘（不推进步骤，只画当前状态）====================
    void drawHaloStatic() {
        int mcx = 122, mcy = 74;
        int moonR = 46;

        // 第一圈
        int r1 = moonR + (_hugHaloStep * 34) / 10;
        int w1 = 3 - (_hugHaloStep * 2) / 10;
        if (w1 < 0) w1 = 0;
        if (r1 <= moonR + 34 && w1 > 0) {
            for (int w = 0; w < w1; w++) {
                _k10->canvas->canvasCircle(mcx, mcy, r1 + w, COL_ACCENT, COL_BG, false);
            }
        }

        // 第二圈
        int r2 = moonR + ((_hugHaloStep - 3) * 34) / 10;
        int w2 = 3 - ((_hugHaloStep - 3) * 2) / 10;
        if (w2 < 0) w2 = 0;
        if (_hugHaloStep > 3 && r2 <= moonR + 34 && w2 > 0) {
            for (int w = 0; w < w2; w++) {
                _k10->canvas->canvasCircle(mcx, mcy, r2 + w, COL_ACCENT_DARK, COL_BG, false);
            }
        }
    }

    // ==================== 光环更新（推进步骤 + 重绘）====================
    void updateHalo(unsigned long now) {
        if (now - _hugLastHaloTime < 80) return;
        _hugLastHaloTime = now;
        _hugHaloStep++;

        // 擦除整个月亮+光环区域并重绘
        _k10->canvas->canvasRectangle(40, 0, 200, 170, COL_BG, COL_BG, true);
        // 重画月亮
        drawMoonFat(76, 28, 92, _hugFatness,
                    lerpColor(COL_SILVER, COL_SILVER_LIT,
                              constrain(_hugFatness, 0.0f, 1.0f)));
        // 画光环
        drawHaloStatic();
        _k10->canvas->updateCanvas();
    }
    // 满月柔光同心环
    void drawHaloRings() {
        int mcx = 122, mcy = 74;
        int moonR = 46;
        // 内圈
        _k10->canvas->canvasCircle(mcx, mcy, moonR + 6, COL_HALO_INNER, COL_BG, false);
        // 外圈
        _k10->canvas->canvasCircle(mcx, mcy, moonR + 12, COL_HALO_OUTER, COL_BG, false);
        _k10->canvas->updateCanvas();
    }

    // ==================== 抱抱文案逐字浮现 ====================
    void updateHugText(unsigned long now) {
        const char* text = "抱抱你，辛苦啦";
        int totalChars = 7; // 7 个中文字

        if (now - _hugLastTextTime >= HUG_TEXT_CHAR_MS) {
            _hugLastTextTime = now;

            if (_hugTextIndex < totalChars) {
                _hugTextIndex++;
                // 擦文字区域
                _k10->canvas->canvasRectangle(20, 180, 200, 40, COL_BG, COL_BG, true);
                // 画当前已显示的字（先 GREY 后 INK 两档）
                // 第一遍：新字用 GREY
                String shown = utf8Prefix(text, _hugTextIndex);
                drawTextCentered(shown.c_str(), 196, COL_GREY, 24);
                // 底部细线（先亮态）
                drawHairline(SCR_W/2, 272, 60);
                _k10->canvas->updateCanvas();
            } else if (!_hugTextDone) {
                // 全部字已显示，覆盖成 INK 色
                _k10->canvas->canvasRectangle(20, 180, 200, 40, COL_BG, COL_BG, true);
                drawTextCentered(text, 196, COL_INK, 24);
                // 细线恢复标准色
                _k10->canvas->canvasRectangle(80, 270, 80, 4, COL_BG, COL_BG, true);
                drawHairline(SCR_W/2, 272, 60);
                _k10->canvas->updateCanvas();
                _hugTextDone = true;
            }
        }
    }

    // UTF-8 前缀辅助（抱抱文案用）
    String utf8Prefix(const char* s, int nChars) {
        String str = s;
        int byteIdx = 0, charCount = 0, len = str.length();
        while (byteIdx < len && charCount < nChars) {
            uint8_t c = (uint8_t)str[byteIdx];
            int charLen = 1;
            if (c >= 0xF0) charLen = 4;
            else if (c >= 0xE0) charLen = 3;
            else if (c >= 0xC0) charLen = 2;
            byteIdx += charLen;
            charCount++;
        }
        return str.substring(0, byteIdx);
    }

    // ==================== 颜色插值 ====================
    // RGB565 颜色线性插值
    uint32_t lerpColor(uint32_t c1, uint32_t c2, float t) {
        if (t <= 0) return c1;
        if (t >= 1) return c2;
        // 拆分 RGB565
        int r1 = (c1 >> 11) & 0x1F;
        int g1 = (c1 >> 5) & 0x3F;
        int b1 = c1 & 0x1F;
        int r2 = (c2 >> 11) & 0x1F;
        int g2 = (c2 >> 5) & 0x3F;
        int b2 = c2 & 0x1F;
        int r = r1 + (int)((r2 - r1) * t);
        int g = g1 + (int)((g2 - g1) * t);
        int b = b1 + (int)((b2 - b1) * t);
        return ((r & 0x1F) << 11) | ((g & 0x3F) << 5) | (b & 0x1F);
    }

    // ==================== 月亮绘制（高精度版）====================
    // drawMoon(x, y, size): x,y=左上角，size=边长
    // 改进：浮点扫描线填充，消除像素缺失
    void drawMoon(int x, int y, int size) {
        int n = MOON_POLY_COUNT;
        float* fpx = (float*)malloc(n * sizeof(float));
        float* fpy = (float*)malloc(n * sizeof(float));
        if (!fpx || !fpy) { free(fpx); free(fpy); return; }

        float scale = (float)size / 200.0f;
        for (int i = 0; i < n; i++) {
            fpx[i] = (float)x + (float)MOON_POLY[i][0] * scale;
            fpy[i] = (float)y + (float)MOON_POLY[i][1] * scale;
        }

        // 找 y 范围
        float minYf = fpy[0], maxYf = fpy[0];
        for (int i = 1; i < n; i++) {
            if (fpy[i] < minYf) minYf = fpy[i];
            if (fpy[i] > maxYf) maxYf = fpy[i];
        }
        int minY = (int)floorf(minYf);
        int maxY = (int)ceilf(maxYf);
        if (minY < 0) minY = 0;
        if (maxY >= SCR_H) maxY = SCR_H - 1;

        // 浮点扫描线填充
        for (int sy = minY; sy <= maxY; sy++) {
            float fy = (float)sy + 0.5f;
            float crossingsF[16];
            int ncross = 0;

            for (int i = 0; i < n; i++) {
                int j = (i + 1) % n;
                float y1 = fpy[i], y2 = fpy[j];
                float x1 = fpx[i], x2 = fpx[j];
                if ((y1 <= fy && y2 > fy) || (y2 <= fy && y1 > fy)) {
                    float denom = y2 - y1;
                    if (fabsf(denom) < 0.001f) continue;
                    float t = (fy - y1) / denom;
                    if (ncross < 16) crossingsF[ncross++] = x1 + t * (x2 - x1);
                }
            }

            for (int a = 1; a < ncross; a++) {
                float key = crossingsF[a];
                int b = a - 1;
                while (b >= 0 && crossingsF[b] > key) {
                    crossingsF[b + 1] = crossingsF[b];
                    b--;
                }
                crossingsF[b + 1] = key;
            }

            for (int a = 0; a + 1 < ncross; a += 2) {
                int x1 = (int)lroundf(crossingsF[a]);
                int x2 = (int)lroundf(crossingsF[a + 1]);
                if (x1 > x2) { int tmp = x1; x1 = x2; x2 = tmp; }
                if (x1 < 0) x1 = 0;
                if (x2 >= SCR_W) x2 = SCR_W - 1;
                if (x2 >= x1) {
                    _k10->canvas->canvasLine(x1, sy, x2, sy, COL_SILVER);
                }
            }
        }

        free(fpx);
        free(fpy);

        // 闭眼线（瓷器色短弧，随月亮同比例缩放）
        int eyeW = size / 30;
        if (eyeW < 2) eyeW = 2;
        for (int i = 0; i < EYE_LINE_COUNT - 1; i++) {
            int x1 = x + (EYE_LINE[i][0] * size) / 200;
            int y1 = y + (EYE_LINE[i][1] * size) / 200;
            int x2 = x + (EYE_LINE[i+1][0] * size) / 200;
            int y2 = y + (EYE_LINE[i+1][1] * size) / 200;
            for (int w = 0; w < eyeW; w++) {
                _k10->canvas->canvasLine(x1, y1 + w, x2, y2 + w, COL_EYE);
            }
        }
    }

    // ==================== 文字辅助 ====================

    // UTF-8 码点安全测宽：中文=字号，半角=字号/2
    int measureTextWidth(const String& text, int fontSize) {
        int width = 0;
        int len = text.length();
        int i = 0;
        while (i < len) {
            uint8_t c = (uint8_t)text[i];
            if (c >= 0xC0) {
                // 多字节字符（中文等）= 字号宽
                width += fontSize;
                if (c >= 0xF0) i += 4;
                else if (c >= 0xE0) i += 3;
                else i += 2;
            } else {
                // ASCII 半角 = 字号/2
                width += fontSize / 2;
                i += 1;
            }
        }
        return width;
    }

    // 居中文字
    void drawTextCentered(const char* text, int y, uint32_t color, int fontSize) {
        String s = text;
        int w = measureTextWidth(s, fontSize);
        int x = (SCR_W - w) / 2;
        if (x < 0) x = 0;
        if (fontSize >= 24) {
            _k10->canvas->canvasText(text, x, y, color, _k10->canvas->eCNAndENFont24, fontSize, true);
        } else {
            _k10->canvas->canvasText(text, x, y, color, _k10->canvas->eCNAndENFont16, fontSize, true);
        }
    }

    // 带字间距的居中文字（用于标题/铭牌）
    void drawTextSpaced(const char* text, int cx, int y, uint32_t color, int fontSize, int spacing) {
        String s = text;
        int totalW = measureTextWidth(s, fontSize) + spacing * (countUtf8(s) - 1);
        int startX = cx - totalW / 2;
        if (startX < 0) startX = 0;

        int x = startX;
        int len = s.length();
        int i = 0;
        while (i < len) {
            uint8_t c = (uint8_t)s[i];
            int charLen = 1;
            int charW;
            if (c >= 0xC0) {
                charW = fontSize;
                if (c >= 0xF0) charLen = 4;
                else if (c >= 0xE0) charLen = 3;
                else charLen = 2;
            } else {
                charW = fontSize / 2;
                charLen = 1;
            }
            String ch = s.substring(i, i + charLen);
            if (fontSize >= 24) {
                _k10->canvas->canvasText(ch.c_str(), x, y, color, _k10->canvas->eCNAndENFont24, fontSize, true);
            } else {
                _k10->canvas->canvasText(ch.c_str(), x, y, color, _k10->canvas->eCNAndENFont16, fontSize, true);
            }
            x += charW + spacing;
            i += charLen;
        }
    }

    // 右对齐文字
    void drawTextRight(const char* text, int rightX, int y, uint32_t color, int fontSize) {
        String s = text;
        int w = measureTextWidth(s, fontSize);
        int x = rightX - w;
        if (x < 0) x = 0;
        if (fontSize >= 24) {
            _k10->canvas->canvasText(text, x, y, color, _k10->canvas->eCNAndENFont24, fontSize, true);
        } else {
            _k10->canvas->canvasText(text, x, y, color, _k10->canvas->eCNAndENFont16, fontSize, true);
        }
    }

    // 细装饰线（居中水平线，指定宽度）
    void drawHairline(int cx, int y, int width) {
        int x1 = cx - width / 2;
        int x2 = cx + width / 2;
        _k10->canvas->canvasLine(x1, y, x2, y, COL_HAIRLINE);
    }

    // UTF-8 字符计数
    int countUtf8(const String& s) {
        int count = 0, len = s.length(), i = 0;
        while (i < len) {
            uint8_t c = (uint8_t)s[i];
            if (c >= 0xF0) i += 4;
            else if (c >= 0xE0) i += 3;
            else if (c >= 0xC0) i += 2;
            else i += 1;
            count++;
        }
        return count;
    }
};

#endif // DISPLAY_STREAM_H
