---
labels:
  - ready-for-agent
---

# K10 Hug Animation v2 — 抱抱动画重设计

Published specification: [K10 Hug Animation](../specs/k10-hug-animation.md).
Related decision: [ADR 0002 — 抱抱动画旁路直推上屏](../adr/0002-hug-direct-drive.md).

## Problem Statement

现有抱抱动画月牙→满月的变形以「每 140ms 跳一步」的方式推进,且底层 LVGL Canvas 路线每笔绘制都触发满帧同步推屏(约 33–38ms/帧,上限约 25 FPS),动画整体呈步进感、无拥抱感,与瓷白银线画廊的克制调性不符,用户不满意。

## Solution

重做抱抱动画:两根细银弧从屏幕两侧如手臂般合拢,把中间月牙环拥入怀,拥抱让月亮丰盈成满月并泛起雾蓝柔光晕,文案整句柔光浮现,随后对称退场还原。动画期间停用 Canvas、走自建 PSRAM 帧缓冲直推路线(ADR 0002),全程连续缓动、≥40 FPS,约 3.5 秒;LED 暖杏灯随动画相位渐亮—呼吸—渐熄。

## User Stories

1. As a 用户, I want short-pressing B to play a hug animation where silver arcs embrace the crescent moon from both sides, so that I can physically feel "being hugged".
2. As a 用户, I want the crescent to ripen into a full moon as the arcs close around it, so that the hug visibly makes the moon whole.
3. As a 用户, I want a mist-blue halo to bloom the moment the arcs embrace the full moon, so that the hug has a gentle emotional highlight.
4. As a 用户, I want the comfort line to fade in as one whole sentence under the moon, so that the text feels calm rather than typed-out.
5. As a 用户, I want the arcs to release and the moon to return to crescent as the animation ends, so that the experience is symmetric and complete.
6. As a 用户, I want the entire animation to run smoothly without step-wise jumps or flicker, so that it feels silky and premium.
7. As a 用户, I want the whole animation to finish in about 3.5 seconds, so that it stays a brief, vivid moment.
8. As a 用户, I want the warm-apricot LED to brighten while arcs close, breathe at full brightness during the embrace, and dim as arcs release, so that light follows the hug's phases.
9. As a 用户, I want any button press during the animation to be ignored, so that the hug moment is never interrupted or delayed by queued interactions.
10. As a 用户, I want repeated hugs to show a different comfort line than the previous one, so that responses don't feel canned.
11. As a 用户, I want long-pressing B to keep triggering Wi-Fi reconnect as before, so that the hug feature doesn't disturb existing recovery flow.
12. As a 用户, I want the screen to return to the standby page cleanly after the animation, so that the device is ready for the next interaction.
13. As a maintainer, I want the hug animation to own one self-contained render path (PSRAM framebuffer + direct SPI push), so that other pages keep using the Canvas path unchanged.
14. As a maintainer, I want comfort-line glyphs generated at build time from a font, so that the runtime doesn't depend on LVGL text rendering during direct-drive.

## Implementation Decisions

- Hug 动画期间完全停用 Canvas:不调用任何 canvas 绘制与 updateCanvas;自建 240×320 RGB565 PSRAM 帧缓冲 + 独立 TFT_eSPI 实例;每帧只推送帧间变化的行带;动画结束画待机页时恢复 Canvas 路径。
- 峰值节奏:合拢 ≈1.8s、抱住 ≈1.2s、退场 ≈0.8s;所有运动用连续时间插值 + easing(合拢 easeInOut、抱住带轻微过冲回弹、退场 easeOut)。
- 视觉:细银双弧 2–3px、雾蓝同心光环、月亮中心 ≈(122,74) 半径 ≈46、文案 y≈210 整句淡入+轻呼吸、底部细线 y=272;动画页纯净构图,无待机提示文字。
- 文案:沿用 8 句句库,`esp_random` 选择且与上一次不重复;字形在构建期以脚本预渲染为掩码位图头文件。
- LED:扩展至可设绝对亮度档位,由动画相位驱动(合拢渐亮、抱住最亮呼吸、退场渐暗回待机);颜色沿用暖杏 0xFFA26B。
- 交互边界:动画期间忽略所有按键(B 短按的 hugRequested 亦忽略,防止积压);B 长按 ≥800ms 重连判定不变。
- 后台动效保留:待机呼吸点、打字机、光圈等由 Canvas 路径照旧运行,不受本动画影响。

## Testing Decisions

- 主要且唯一的测试接缝沿用 0001:设备级行为观测(真机 K10 + 串口日志 + 肉眼),不新增内部测试接缝。
- 合格的验收:短按 B 后串口打印 `hug action=start` 与 `hug action=complete` 各一次且间隔 ≈3.5s;肉眼无步进/花屏/闪烁;LED 三相位分明;动画结束后待机页完整;连续两次动画文案不同;动画期间按 A/B 不产生排队交互;长按 B 仍触发重连。
- 构建门槛:不带本地凭证时 `pio run` 通过;直推路径与 Canvas 路径同固件共存编译通过。

## Out of Scope

- IMU 手势(摇晃/拿起)触发、旋律音效、在线文案、动画期间相机/语音并发。
- 修改待机、拍照、对话等其他页面的现有视觉与 Canvas 路径。
- B 键重连判定阈值(保持 800ms)与按键映射的任何调整。

## Further Notes

- 字节序注意:`LV_COLOR_16_SWAP=1` 意味着 LVGL 缓冲字节序与 TFT 期望可能相反,直推帧缓冲需按 TFT 期望字节序写入,首片(骨架)验收时以红/蓝纯色帧核对。
- 语音播报(用户追加需求):板载 esp_tts 中文离线合成(小乐音色,库内置无需烧录模型),与屏幕上同一句文案在淡入瞬间同步播放;TTS 失败静默降级。对应 ticket 07。
- 演示窗口:本动画是 MVP 演示(2026-08-30)的展示点之一,验收标准以真机观感为准。