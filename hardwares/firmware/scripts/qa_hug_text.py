#!/usr/bin/env python3
"""Programmatic QA for generated hug text masks (no human visual needed)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from gen_hug_text import load_sentences, load_font, render_mask, W, H  # noqa: E402


def cols(mask: bytes) -> list[int]:
    counts = []
    for xx in range(W):
        c = 0
        for yy in range(H):
            byte = mask[yy * (W // 8) + xx // 8]
            if (byte >> (7 - xx % 8)) & 1:
                c += 1
        counts.append(c)
    return counts


def main() -> None:
    sents = load_sentences()
    font = load_font()
    masks = [render_mask(s, font) for s in sents]
    failures = 0
    for s, m in zip(sents, masks):
        c = cols(m)
        nz = [x for x, v in enumerate(c) if v > 0]
        left, right = nz[0], nz[-1]
        width = right - left + 1
        margin_ok = abs(left - (W - 1 - right)) <= 2
        width_ok = 40 <= width <= W - 8
        # column projection should not contain hollow gaps inside the text run
        interior_zero_runs = 0
        run = 0
        for x in range(left, right + 1):
            if c[x] == 0:
                run += 1
            else:
                if run >= 20:
                    interior_zero_runs += 1
                run = 0
        status = "OK " if (width_ok and margin_ok and interior_zero_runs == 0) else "FAIL"
        if status == "FAIL":
            failures += 1
        print(f"{status} {s}: left={left:3d} right={right:3d} width={width:3d} "
              f"margin_sym={margin_ok} hollow_runs={interior_zero_runs}")
    print(f"QA {'PASSED' if failures == 0 else 'FAILED'} ({len(sents)} lines, {failures} failures)")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()