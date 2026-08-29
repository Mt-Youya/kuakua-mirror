# -*- coding: utf-8 -*-
"""
preview_moon_render.py — 待机页月亮新旧对比预览

按固件 drawMoon 的真实算法（浮点扫描线填充 + EYE_LINE 描线）
在 240×320 画布上渲染待机页，输出 before/after PNG 各一张。
"""
import math
from PIL import Image, ImageDraw, ImageFont

SCR_W, SCR_H = 240, 320


def rgb565(v):
    return ((v >> 11) & 0x1F) * 255 // 31, ((v >> 5) & 0x3F) * 255 // 63, (v & 0x1F) * 255 // 31


COL_BG = rgb565(0xF6F3EC)
COL_INK = rgb565(0x2E3238)
COL_SILVER = rgb565(0xA9B1B9)
COL_DIM = rgb565(0x98A1A9)
COL_HAIRLINE = rgb565(0xDAD6CC)
COL_EYE = rgb565(0xF4F0E9)

OLD_POLY = [
    (100, 0), (112, 1), (124, 5), (134, 12), (142, 22), (148, 35),
    (152, 50), (154, 65), (155, 80), (154, 95), (152, 110),
    (148, 125), (142, 138), (134, 148), (124, 155), (112, 159),
    (100, 160),
    (108, 159), (117, 155), (126, 148), (134, 138), (141, 125),
    (146, 110), (149, 95), (150, 80), (149, 65), (146, 50),
    (141, 35), (134, 22), (126, 12), (117, 5), (108, 1),
    (100, 0),
]
OLD_EYE = [(52, 82), (57, 86), (62, 87), (66, 83)]

NEW_POLY = [
    (139, 150),
    (126, 156), (112, 159), (97, 160), (83, 158), (69, 154),
    (56, 147), (45, 138), (35, 127), (28, 115), (23, 101),
    (20, 87), (20, 73), (23, 59), (28, 45), (35, 33),
    (45, 22), (56, 13), (69, 6), (83, 2), (97, 0),
    (112, 1), (126, 4), (139, 10),
    (126, 11), (114, 15), (102, 21), (92, 29), (83, 39),
    (77, 50), (72, 62), (70, 75), (70, 88), (73, 100),
    (78, 112), (85, 123), (94, 133), (104, 140), (116, 146),
    (128, 149), (141, 150),
]
NEW_EYE = [(38, 80), (43, 83), (48, 84), (53, 82)]


def draw_moon(img, draw, x, y, size, poly, eye, color=COL_SILVER):
    """复刻固件 drawMoon：浮点扫描线填充 + 闭眼线。"""
    n = len(poly)
    scale = size / 200.0
    px = [(x + px0 * scale) for px0, _ in poly]
    py = [(y + py0 * scale) for _, py0 in poly]

    min_y = max(0, int(math.floor(min(py))))
    max_y = min(SCR_H - 1, int(math.ceil(max(py))))
    for sy in range(min_y, max_y + 1):
        fy = sy + 0.5
        cx_ = []
        for i in range(n):
            j = (i + 1) % n
            y1, y2 = py[i], py[j]
            x1, x2 = px[i], px[j]
            if (y1 <= fy < y2) or (y2 <= fy < y1):
                cx_.append(x1 + (x2 - x1) * (fy - y1) / (y2 - y1))
        cx_.sort()
        for k in range(0, len(cx_) - 1, 2):
            xa = max(0, int(round(cx_[k])))
            xb = min(SCR_W - 1, int(round(cx_[k + 1])))
            if xb >= xa:
                draw.line((xa, sy, xb, sy), fill=color)

    eye_w = max(2, size // 30)
    for i in range(len(eye) - 1):
        x1 = x + eye[i][0] * scale
        y1 = y + eye[i][1] * scale
        x2 = x + eye[i + 1][0] * scale
        y2 = y + eye[i + 1][1] * scale
        for w in range(eye_w):
            draw.line((x1, y1 + w, x2, y2 + w), fill=COL_EYE)


def text_center(draw, text, y, fill, font):
    w = draw.textlength(text, font=font)
    draw.text(((SCR_W - w) / 2, y), text, fill=fill, font=font)


def render_standby(path, poly, eye, tag):
    img = Image.new("RGB", (SCR_W, SCR_H), COL_BG)
    draw = ImageDraw.Draw(img)
    draw_moon(img, draw, 76, 28, 92, poly, eye)
    font24 = None
    try:
        font24 = ImageFont.truetype("msyh.ttc", 24)
        font16 = ImageFont.truetype("msyh.ttc", 16)
    except OSError:
        font24 = font16 = ImageFont.load_default()
    text_center(draw, "对我说说话", 198, COL_INK, font24)
    text_center(draw, "或短按A拍照", 232, COL_INK, font24)
    draw.line((90, 272, 150, 272), fill=COL_HAIRLINE)
    text_center(draw, "在线", 288, COL_DIM, font16)
    big = img.resize((SCR_W * 2, SCR_H * 2), Image.NEAREST)
    big.save(path)
    print(f"saved {path} ({tag})")


render_standby("preview_moon_before.png", OLD_POLY, OLD_EYE, "before")
render_standby("preview_moon_after.png", NEW_POLY, NEW_EYE, "after")