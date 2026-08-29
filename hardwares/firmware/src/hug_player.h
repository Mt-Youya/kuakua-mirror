/*
 * hug_player.h — 抱抱动画 v2 直推渲染管线 (ADR 0002)
 *
 * 动画期间停用 LVGL Canvas 路径:自持 240x320 RGB565 PSRAM 帧缓冲与独立
 * TFT_eSPI 实例,每帧仅推送帧间变化的行带;动画结束由调用方画待机页归还 Canvas。
 *
 * 约定:
 *  - 动画期间禁止调用任何 Canvas/updateCanvas 相关 API
 *  - 帧缓冲字节序为常规 RGB565;真机若红蓝反,把 HP_BYTESWAP 改为 1 重烧
 *  - 旋转与库一致 setRotation(2),帧缓冲 W=240 H=320
 *
 * 流程:标定序列(0-1.2s,红/绿/蓝,T2 验收用) → 时间轴 3.8s
 *   合拢 1.8s(双弧收拢 + 月牙丰盈成满月) → 抱住 1.2s(满月呼吸 + 光环) → 退场 0.8s
 */

#ifndef HUG_PLAYER_H
#define HUG_PLAYER_H

#include <Arduino.h>
#include <TFT_eSPI.h>
#include <math.h>
#include "config.h"         // HUG_COMFORT_LINES
#include "hug_text_bmp.h"   // 文案掩码位图 (scripts/gen_hug_text.py 生成)

#define HP_W 240
#define HP_H 320
#define HP_BYTESWAP 1   // 真机实测红/蓝互换 → 帧缓冲需按反字节序写入

// 时间轴 (ms)
#define HP_CLOSE_MS 1800
#define HP_HOLD_MS 1200
#define HP_EXIT_MS 800
#define HP_TOTAL_MS (HP_CLOSE_MS + HP_HOLD_MS + HP_EXIT_MS)

#define HP_PHASE_CLOSE 0
#define HP_PHASE_HOLD 1
#define HP_PHASE_EXIT 2

// 8bit->565
#define RGB565(R, G, B) (((uint16_t)((R) & 0xF8) << 8) | ((uint16_t)((G) & 0xFC) << 3) | ((uint16_t)(B) >> 3))

// 蓝白主色调 (与 config.h 雾蓝/瓷白画廊风一致)
static const uint16_t HP_COL_BG      = RGB565(0xF6, 0xF3, 0xEC);  // 瓷白底
static const uint16_t HP_COL_MOON_0 = RGB565(0x8F, 0xA8, 0xBC);  // 月牙:雾蓝银
static const uint16_t HP_COL_MOON_1 = RGB565(0xE4, 0xEE, 0xF5);  // 满月:蓝白亮
static const uint16_t HP_COL_ARC    = RGB565(0xA5, 0xBC, 0xCF);  // 弧线:雾蓝
static const uint16_t HP_COL_ARC_LIT= RGB565(0xC6, 0xD8, 0xE6);  // 弧线(抱住微亮)
static const uint16_t HP_COL_HALO_IN  = RGB565(0xD8, 0xE2, 0xEC);
static const uint16_t HP_COL_HALO_OUT = RGB565(0xC6, 0xD5, 0xE2);
static const uint16_t HP_COL_HAIRLINE = RGB565(0xDA, 0xD6, 0xCC);
static const uint16_t HP_COL_INK      = RGB565(0x2E, 0x32, 0x38);  // 文字墨色

// ---- 月亮几何 ----
// 月牙轮廓:外弧(顶→底) + 内弧(底回顶),200x200 画布坐标,闭合多边形
static const int16_t HP_MOON_POLY[][2] = {
    {100,  0}, {112,  1}, {124,  5}, {134, 12}, {142, 22}, {148, 35},
    {152, 50}, {154, 65}, {155, 80}, {154, 95}, {152,110},
    {148,125}, {142,138}, {134,148}, {124,155}, {112,159},
    {100,160},
    {108,159}, {117,155}, {126,148}, {134,138}, {141,125},
    {146,110}, {149, 95}, {150, 80}, {149, 65}, {146, 50},
    {141, 35}, {134, 22}, {126, 12}, {117,  5}, {108,  1},
    {100,  0}
};
#define HP_MOON_POLY_COUNT (sizeof(HP_MOON_POLY) / sizeof(HP_MOON_POLY[0]))

// 月亮屏上位置(同现有 UI):左上 76,28,size 92 → 中心 ≈(122, 74),半径 ≈46
#define HP_MOON_X 76
#define HP_MOON_Y 28
#define HP_MOON_SIZE 92
#define HP_MOON_CX (HP_MOON_X + HP_MOON_SIZE / 2)   // 122
#define HP_MOON_CY (HP_MOON_Y + 46)                 // 74
#define HP_MOON_R0 46
#define HP_ARC_R 58                // 抱住时弧线半径(贴月外圈)
#define HP_ARC_W 3                 // 弧线厚度
#define HP_TEXT_TOP 164            // 文案条带顶(掩码 40 行 164..203)
#define HP_LINE_Y 272              // 底部细线

class HugPlayer {
public:
    HugPlayer() : _tft(), _fb(nullptr), _init(false), _active(false),
                  _startMs(0), _lastPhase(-1), _queuedPhase(-1),
                  _lineIdx(0), _lastLineIdx(-1),
                  _moonCentX(0), _moonCentY(0), _moonRAvg(0), _moonInit(false),
                  _dirtyMin(0), _dirtyMax(0), _fpsFrames(0), _fpsLastMs(0) {}

    // 懒初始化 TFT 实例 + PSRAM 帧缓冲(首次动画时)
    void ensureReady() {
        if (_init) return;
        _init = true;
        _tft.init();
        _tft.setRotation(2);
        _fb = (uint16_t*)ps_malloc((size_t)HP_W * HP_H * 2);
        if (!_fb) {
            Serial.println("[HUG] fb alloc failed");
            return;
        }
        Serial.println("[HUG] player ready");
        fillFb(HP_COL_BG);
        pushAll();
    }

    bool ready() const { return _init && _fb != nullptr; }

    // 开始:选句、整帧底色 + 静态元素,立即进入时间轴
    void start() {
        ensureReady();
        if (!ready()) return;
        initMoonGeometry();
        pickLine();
        _active = true;
        _startMs = millis();
        _lastPhase = -1;
        _queuedPhase = -1;
        _fpsFrames = 0;
        _fpsLastMs = _startMs;
        fillFb(HP_COL_BG);
        drawLineStatic();
        drawMoonFat(HP_MOON_X, HP_MOON_Y, HP_MOON_SIZE, 0.0f, HP_COL_MOON_0);
        pushAll();
        Serial.printf("[HUG] start line=%d text=%s\n", _lineIdx, currentLine());
    }

    // 每帧推进;返回 true = 动画结束(调用方画待机页归还 Canvas)
    bool tick() {
        if (!_active) return false;
        unsigned long now = millis();
        unsigned long elapsed = now - _startMs;

        if (elapsed >= HP_TOTAL_MS) {
            _active = false;
            Serial.printf("[HUG] done ms=%lu\n", now);
            return true;
        }

        int phase;
        float progress;
        if (elapsed < HP_CLOSE_MS) {
            phase = HP_PHASE_CLOSE;
            progress = easeInOut((float)elapsed / HP_CLOSE_MS);
        } else if (elapsed < HP_CLOSE_MS + HP_HOLD_MS) {
            phase = HP_PHASE_HOLD;
            progress = (float)(elapsed - HP_CLOSE_MS) / HP_HOLD_MS;
        } else {
            phase = HP_PHASE_EXIT;
            progress = easeOut((float)(elapsed - HP_CLOSE_MS - HP_HOLD_MS) / HP_EXIT_MS);
        }
        if (phase != _lastPhase) {
            _lastPhase = phase;
            _queuedPhase = phase;
        }

        renderFrame(phase, progress);
        pushDirty();
        fpsBookkeeping(now);
        return false;
    }

    bool active() const { return _active; }

    // 相位新进入事件(取一次即清;T5 LED / T7 语音用)
    int takePhaseEntered() {
        int t = _queuedPhase;
        _queuedPhase = -1;
        return t;
    }

    const char* currentLine() const { return HUG_COMFORT_LINES[_lineIdx]; }
    int currentLineIndex() const { return _lineIdx; }

private:
    TFT_eSPI _tft;
    uint16_t* _fb;
    bool _init;
    bool _active;
    unsigned long _startMs;
    int _lastPhase;
    int _queuedPhase;
    int _lineIdx;
    int _lastLineIdx;

    // 月牙几何预计算
    int _moonCentX, _moonCentY, _moonRAvg;
    bool _moonInit;

    int _dirtyMin, _dirtyMax;
    uint32_t _fpsFrames;
    unsigned long _fpsLastMs;

    // ---- 句库 ----
    void pickLine() {
        int n = HUG_COMFORT_LINES_COUNT;
        int idx = (int)(esp_random() % n);
        if (idx == _lastLineIdx) idx = (idx + 1) % n;
        _lastLineIdx = idx;
        _lineIdx = idx;
    }

    void initMoonGeometry() {
        if (_moonInit) return;
        int n = HP_MOON_POLY_COUNT;
        long sx = 0, sy = 0;
        for (int i = 0; i < n; i++) { sx += HP_MOON_POLY[i][0]; sy += HP_MOON_POLY[i][1]; }
        _moonCentX = sx / n;
        _moonCentY = sy / n;
        long sr = 0;
        for (int i = 0; i < n; i++) {
            int dx = HP_MOON_POLY[i][0] - _moonCentX;
            int dy = HP_MOON_POLY[i][1] - _moonCentY;
            sr += (int)sqrtf((float)(dx * dx + dy * dy));
        }
        _moonRAvg = sr / n;
        _moonInit = true;
    }

    // ---- 帧缓冲 ----
    uint16_t swap16(uint16_t c) {
#if HP_BYTESWAP
        return (uint16_t)((c >> 8) | (c << 8));
#else
        return c;
#endif
    }

    void putPx(int x, int y, uint16_t c) {
        if (x < 0 || x >= HP_W || y < 0 || y >= HP_H) return;
        _fb[y * HP_W + x] = swap16(c);
    }

    void fillFb(uint16_t c) {
        uint16_t cc = swap16(c);
        for (int i = 0; i < HP_W * HP_H; i++) _fb[i] = cc;
    }

    void fillRectFb(int x0, int y0, int w, int h, uint16_t c) {
        if (x0 < 0) { w += x0; x0 = 0; }
        if (y0 < 0) { h += y0; y0 = 0; }
        if (x0 + w > HP_W) w = HP_W - x0;
        if (y0 + h > HP_H) h = HP_H - y0;
        if (w <= 0 || h <= 0) return;
        uint16_t cc = swap16(c);
        for (int y = y0; y < y0 + h; y++) {
            uint16_t* row = &_fb[y * HP_W + x0];
            for (int x = 0; x < w; x++) row[x] = cc;
        }
    }

    // 实心圆盘(扫描线)
    void drawDiscFb(int cx, int cy, int r, uint16_t c) {
        int r2 = r * r;
        for (int y = -r; y <= r; y++) {
            int dx = (int)sqrtf((float)(r2 - y * y));
            int x0 = cx - dx, x1 = cx + dx;
            if (x0 < 0) x0 = 0;
            if (x1 >= HP_W) x1 = HP_W - 1;
            if (x1 < x0) continue;
            for (int x = x0; x <= x1; x++) putPx(x, cy + y, c);
        }
    }

    // 行填充(x 为相对圆心偏移)
    void fillRun(int cx, int y, int xa, int xb, uint16_t c) {
        for (int x = xa; x <= xb; x++) putPx(cx + x, y, c);
    }

    // 圆弧带(扫描线版,零三角函数):side=-1 左半圆(x≤圆心),+1 右半圆(x≥圆心),0 整圆
    void drawArcHalf(int cx, int cy, int r, int w, int side, uint16_t c) {
        int lo = r - w, hi = r + w;
        if (lo < 1) lo = 1;
        int hi2 = hi * hi, lo2 = lo * lo;
        for (int y = -hi; y <= hi; y++) {
            int y2 = y * y;
            if (y2 > hi2) continue;
            int dxOut = (int)sqrtf((float)(hi2 - y2));
            int dxIn = y2 < lo2 ? (int)sqrtf((float)(lo2 - y2)) : -1;
            if (dxIn >= 0) {
                // 环带分左右两段
                int xaL = -dxOut, xbL = -dxIn - 1;
                int xaR = dxIn + 1, xbR = dxOut;
                if (side <= 0 && xaL <= xbL) {
                    if (xbL > 0) xbL = 0;
                    if (xaL <= xbL) fillRun(cx, cy + y, xaL, xbL, c);
                }
                if (side >= 0 && xaR <= xbR) {
                    if (xaR < 0) xaR = 0;
                    if (xaR <= xbR) fillRun(cx, cy + y, xaR, xbR, c);
                }
            } else {
                int xa = -dxOut, xb = dxOut;
                if (side < 0) xb = 0;
                else if (side > 0) xa = 0;
                if (xa <= xb) fillRun(cx, cy + y, xa, xb, c);
            }
        }
    }

    // 同心环(整圆):复用 drawArcHalf
    void drawRing(int cx, int cy, int r, int w, uint16_t c) {
        drawArcHalf(cx, cy, r, w, 0, c);
    }

    // ---- 静物:底部细线 ----
    void drawLineStatic() {
        uint16_t cc = swap16(HP_COL_HAIRLINE);
        for (int x = 90; x < 150; x++) putPx(x, HP_LINE_Y, cc);
    }

    // ---- 文案:掩码条带以 alpha 淡入(0=全隐,1=全亮) ----
    void drawTextMask(float alpha) {
        const uint8_t* m = HUG_TEXT_MASKS[_lineIdx];
        // 擦文案条带
        fillRectFb(0, HP_TEXT_TOP, HP_W, HUG_TEXT_BMP_H, HP_COL_BG);
        touchY(HP_TEXT_TOP, HP_TEXT_TOP + HUG_TEXT_BMP_H - 1);
        if (alpha <= 0.02f) return;
        uint16_t col = lerp16(HP_COL_BG, HP_COL_INK, constrain16(alpha));
        uint16_t csw = swap16(col);
        for (int y = 0; y < HUG_TEXT_BMP_H; y++) {
            for (int x = 0; x < HUG_TEXT_BMP_W; x++) {
                uint8_t byte = m[y * HUG_TEXT_BMP_BYTES_PER_LINE + (x >> 3)];
                if ((byte >> (7 - (x & 7))) & 1) {
                    _fb[(HP_TEXT_TOP + y) * HP_W + x] = csw;
                }
            }
        }
    }

    // ---- 月亮:fatness 0=月牙, 1=满月(带轻微过冲到 >1 也合法) ----
    void drawMoonFat(int x, int y, int size, float fatness, uint16_t color) {
        if (!_moonInit) initMoonGeometry();
        const int n = HP_MOON_POLY_COUNT;
        float fpx[HP_MOON_POLY_COUNT], fpy[HP_MOON_POLY_COUNT];
        float scale = (float)size / 200.0f;
        for (int i = 0; i < n; i++) {
            float dx = (float)(HP_MOON_POLY[i][0] - _moonCentX);
            float dy = (float)(HP_MOON_POLY[i][1] - _moonCentY);
            float rOrig = sqrtf(dx * dx + dy * dy);
            float r = rOrig + (_moonRAvg - rOrig) * fatness;
            float nx, ny;
            if (rOrig < 0.5f) { nx = (float)_moonCentX; ny = (float)_moonCentY; }
            else {
                float ratio = r / rOrig;
                nx = (float)_moonCentX + dx * ratio;
                ny = (float)_moonCentY + dy * ratio;
            }
            fpx[i] = (float)x + nx * scale;
            fpy[i] = (float)y + ny * scale;
        }
        int minY = (int)floorf(fpy[0]), maxY = (int)ceilf(fpy[0]);
        for (int i = 1; i < n; i++) {
            if (fpy[i] < minY) minY = (int)floorf(fpy[i]);
            if (fpy[i] > maxY) maxY = (int)ceilf(fpy[i]);
        }
        if (minY < 0) minY = 0;
        if (maxY >= HP_H) maxY = HP_H - 1;
        for (int sy = minY; sy <= maxY; sy++) {
            float fy = (float)sy + 0.5f;
            float xs[16];
            int ncross = 0;
            for (int i = 0; i < n; i++) {
                int j = (i + 1) % n;
                float y1 = fpy[i], y2 = fpy[j];
                if ((y1 <= fy && y2 > fy) || (y2 <= fy && y1 > fy)) {
                    float t = (fy - y1) / (y2 - y1);
                    if (ncross < 16) xs[ncross++] = fpx[i] + t * (fpx[j] - fpx[i]);
                }
            }
            for (int a = 1; a < ncross; a++) {
                float key = xs[a];
                int b = a - 1;
                while (b >= 0 && xs[b] > key) { xs[b + 1] = xs[b]; b--; }
                xs[b + 1] = key;
            }
            for (int a = 0; a + 1 < ncross; a += 2) {
                int x1 = (int)lroundf(xs[a]);
                int x2 = (int)lroundf(xs[a + 1]);
                if (x1 > x2) { int t = x1; x1 = x2; x2 = t; }
                if (x1 < 0) x1 = 0;
                if (x2 >= HP_W) x2 = HP_W - 1;
                for (int xx = x1; xx <= x2; xx++) putPx(xx, sy, color);
            }
        }
    }

// ---- 渲染一帧 ----
    void renderFrame(int phase, float p) {
        _dirtyMin = HP_H;
        _dirtyMax = -1;

        // 静态元素每帧重画
        drawLineStatic();

        // 动态区擦除(月亮+弧线+光环的活动范围 y 6..148)
        fillRectFb(40, 6, 160, 142, HP_COL_BG);

        if (phase == HP_PHASE_CLOSE) {
            // 双弧从两侧合拢 + 月牙丰盈(带轻微过冲),月渐亮成蓝白
            float fx = p + 0.05f * sinf(p * 3.14159265f);
            float fat = fx;
            int leftCx = (int)lerp(-30.0f, (float)HP_MOON_CX, p);
            int rightCx = (int)lerp(270.0f, (float)HP_MOON_CX, p);
            uint16_t moonCol = lerp16(HP_COL_MOON_0, HP_COL_MOON_1, constrain16(fat));
            drawMoonFat(HP_MOON_X, HP_MOON_Y, HP_MOON_SIZE, fat, moonCol);
            // 左弧(左半圆)+ 右弧(右半圆):合拢时两弧圆心从屏外平移至月亮中心,拼成环抱
            drawArcHalf(leftCx, HP_MOON_CY, HP_ARC_R, HP_ARC_W, -1, HP_COL_ARC);
            drawArcHalf(rightCx, HP_MOON_CY, HP_ARC_R, HP_ARC_W, +1, HP_COL_ARC);
            touchY(6, 148);
        } else if (phase == HP_PHASE_HOLD) {
            // 满月轻呼吸 + 弧线搂抱静止 + 光环扩散渐隐 + 文案淡入呼吸
            float breath = 1.0f + 0.045f * sinf(p * 3.14159265f * 2.0f);
            drawMoonFat(HP_MOON_X, HP_MOON_Y, HP_MOON_SIZE, breath, HP_COL_MOON_1);
            drawArcHalf(HP_MOON_CX, HP_MOON_CY, HP_ARC_R, HP_ARC_W, -1, HP_COL_ARC_LIT);
            drawArcHalf(HP_MOON_CX, HP_MOON_CY, HP_ARC_R, HP_ARC_W, +1, HP_COL_ARC_LIT);

            // 光环:前 0.45s 扩散,之后渐隐
            float haloAmt = min(p / 0.45f, 1.0f);
            float fadeAmt = p > 0.6f ? (p - 0.6f) / 0.4f : 0.0f;
            float vis = haloAmt * (1.0f - fadeAmt);
            if (vis > 0.01f) {
                for (int k = 0; k < 8; k++) {
                    float kp = (float)k / 8.0f;
                    int rr = HP_MOON_R0 + 8 + (int)(kp * 22.0f);
                    uint16_t cc = lerp16(HP_COL_HALO_IN, HP_COL_HALO_OUT, kp);
                    uint16_t ring = lerp16(cc, HP_COL_BG, 1.0f - vis);
                    drawRing(HP_MOON_CX, HP_MOON_CY, rr, 2, ring);
                }
            }
            touchY(6, 148);

            // 文案:整句柔光淡入(前 0.45s)+ 轻微呼吸
            float alphaIn = min(p / 0.45f, 1.0f);
            float breathA = 1.0f + 0.05f * sinf(p * 3.14159265f * 2.0f);
            drawTextMask(0.9f * alphaIn * breathA);
        } else {
            // 退场:月亮还原月牙、柔光熄成雾蓝银、弧线松开、文案淡出
            float fat = 1.0f - p;
            int leftCx = (int)lerp(-30.0f, (float)HP_MOON_CX, 1.0f - p);
            int rightCx = (int)lerp(270.0f, (float)HP_MOON_CX, 1.0f - p);
            uint16_t moon = lerp16(HP_COL_MOON_1, HP_COL_MOON_0, p);
            uint16_t arcCol = lerp16(HP_COL_ARC_LIT, HP_COL_BG, p);
            drawMoonFat(HP_MOON_X, HP_MOON_Y, HP_MOON_SIZE, fat, moon);
            drawArcHalf(leftCx, HP_MOON_CY, HP_ARC_R, HP_ARC_W, -1, arcCol);
            drawArcHalf(rightCx, HP_MOON_CY, HP_ARC_R, HP_ARC_W, +1, arcCol);
            touchY(6, 148);
            float alphaOut = 0.9f * (1.0f - p);
            if (alphaOut < 0) alphaOut = 0;
            drawTextMask(alphaOut);
        }
    }

    // ---- 上屏 ----
    void touchY(int y0, int y1) {
        if (y0 < 0) y0 = 0;
        if (y1 >= HP_H) y1 = HP_H - 1;
        if (y1 < y0) return;
        _dirtyMin = min(_dirtyMin, y0);
        _dirtyMax = max(_dirtyMax, y1);
    }

    void pushAll() {
        _tft.startWrite();
        _tft.setAddrWindow(0, 0, HP_W, HP_H);
        _tft.pushColors(_fb, HP_W * HP_H, false);
        _tft.endWrite();
        _dirtyMin = HP_H;
        _dirtyMax = -1;
    }

    void pushDirty() {
        if (_dirtyMax < _dirtyMin) return;
        int y0 = _dirtyMin, h = _dirtyMax - _dirtyMin + 1;
        _tft.startWrite();
        _tft.setAddrWindow(0, y0, HP_W, h);
        _tft.pushColors(&_fb[y0 * HP_W], HP_W * h, false);
        _tft.endWrite();
        _dirtyMin = HP_H;
        _dirtyMax = -1;
    }

    // ---- 缓动/插值 ----
    float easeInOut(float t) {
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        return t * t * (3.0f - 2.0f * t);
    }
    float easeOut(float t) {
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        return 1.0f - (1.0f - t) * (1.0f - t);
    }
    float lerp(float a, float b, float t) { return a + (b - a) * t; }
    float constrain16(float f) { return f < 0.0f ? 0.0f : (f > 1.0f ? 1.0f : f); }

    uint16_t lerp16(uint16_t a, uint16_t b, float t) {
        if (t <= 0) return a;
        if (t >= 1) return b;
        int r = ((a >> 11) & 0x1F) + (int)((((b >> 11) & 0x1F) - ((a >> 11) & 0x1F)) * t);
        int g = ((a >> 5) & 0x3F) + (int)((((b >> 5) & 0x3F) - ((a >> 5) & 0x3F)) * t);
        int bl = (a & 0x1F) + (int)(((b & 0x1F) - (a & 0x1F)) * t);
        return (uint16_t)((r << 11) | (g << 5) | bl);
    }

    void fpsBookkeeping(unsigned long now) {
        _fpsFrames++;
        if (now - _fpsLastMs >= 500) {
            float fps = _fpsFrames * 1000.0f / (float)(now - _fpsLastMs);
            Serial.printf("[HUG] fps=%.1f\n", fps);
            _fpsFrames = 0;
            _fpsLastMs = now;
        }
    }
};

#endif // HUG_PLAYER_H