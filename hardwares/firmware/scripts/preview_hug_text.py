#!/usr/bin/env python3
"""Render T1 mask preview PNGs for visual inspection."""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from gen_hug_text import load_sentences, load_font, render_mask, W, H  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / ".scratch" / "hug-animation-v2" / "t1_preview.png"
OUT.parent.mkdir(parents=True, exist_ok=True)


def to_img(mask: bytes) -> Image.Image:
    img = Image.new("L", (W, H), 255)
    px = img.load()
    for yy in range(H):
        for xx in range(W):
            byte = mask[yy * (W // 8) + xx // 8]
            if (byte >> (7 - xx % 8)) & 1:
                px[xx, yy] = 0
    return img


def main() -> None:
    sents = load_sentences()
    font = load_font()
    masks = [render_mask(s, font) for s in sents]
    pad = 12
    tw = W * 2 + pad * 3
    th = (H + pad) * len(sents) + pad
    canvas = Image.new("RGB", (tw, th), (246, 243, 236))
    d = ImageDraw.Draw(canvas)
    x = pad * 2 + W // 2
    for i, (s, m) in enumerate(zip(sents, masks)):
        y = pad + i * (H + pad)
        canvas.paste(to_img(m), (x, y))
        d.text((pad, y + H // 4), s, fill=(40, 40, 40))
        d.line([(x - W // 2 - 6, y - 4), (x + W // 2 + 6, y - 4)], fill=(220, 120, 120), width=2)
    canvas.save(OUT)
    print(f"preview saved: {OUT}")


if __name__ == "__main__":
    main()