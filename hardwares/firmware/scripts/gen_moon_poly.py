# -*- coding: utf-8 -*-
"""
gen_moon_poly.py — 夸夸镜月牙轮廓生成与预览

用途：
  1. 用两圆差集（外圆盘 - 内圆盘）参数化生成精致月牙点列，
     输出 C 数组直接替换 display_stream.h 中的 MOON_POLY / EYE_LINE。
  2. 用 ASCII 渲染旧/新轮廓，肉眼核对形状（月牙应有明显两尖 + 凸凹两弧）。
  3. 计算多边形质心与平均半径（drawMoonFat 抱抱变形到满月依赖这两个量）。

几何：200×200 画布，y 向下。
  外圆 C1=(100,80) r1=80；内圆 C2=(140,80) r2=70（圆心距 d=40）。
  月牙 = 外圆盘 − 内圆盘：左边一弯，宽 ~50px（y=80 处），高 ~140px。
"""
import math


def moon_points(cx, cy, r1, r2, d, outer_steps=17, inner_steps=17):
    """返回月牙多边形点列（外弧 + 内弧，顺时针有序，含闭合点）。

    外弧：外圆上位于内盘外的长弧（下交点→顶→最左→底→上交点，共 outer_steps+1 点）
    内弧：内圆上位于外盘内的左窄弧（上交点→最左→下交点，共 inner_steps+1 点）
    """
    c2x = cx + d  # 内圆心 (c2x, cy)

    # 交点: x = (d^2 + r1^2 - r2^2) / (2d)  （相对外圆心）
    xi = (d * d + r1 * r1 - r2 * r2) / (2.0 * d)
    if xi >= r1:
        raise ValueError("两圆不相交，参数需要调整")
    yi = math.sqrt(r1 * r1 - xi * xi)
    # 外圆点: (cx+xi, cy±yi)
    theta_top = math.degrees(math.atan2(yi, xi))    # 下交点在外圆上的角度 (y 向下)
    # 外弧：theta 从 theta_top 增大到 360-theta_top，经过 180°(最左点)
    points = []
    for i in range(outer_steps + 1):
        t = theta_top + (360.0 - 2.0 * theta_top) * i / outer_steps
        rad = math.radians(t)
        points.append((round(cx + r1 * math.cos(rad)), round(cy + r1 * math.sin(rad))))

    # 内弧：内圆上位于外盘内的弧（经过内圆最左点 180°）
    dx, dy = xi - d, -yi  # 上交点相对内圆心
    theta_in_top = math.degrees(math.atan2(dy, dx))  # ≈ 270° 附近
    start = theta_in_top
    end = start - 180.0  # 顺时针经 180° 到 +91°（下交点）
    for i in range(inner_steps + 1):
        t = start + (end - start) * i / inner_steps
        rad = math.radians(t)
        points.append((round(c2x + r2 * math.cos(rad)), round(cy + r2 * math.sin(rad))))

    return points, (cx, cy, c2x, xi, yi)


def render(points, w=200, h=200):
    """scanline 填充 ASCII 渲染（boiled: 用边界采样即可，差集形状简单凸凹）"""
    grid = [[' '] * w for _ in range(h)]
    min_y = min(p[1] for p in points)
    max_y = max(p[1] for p in points)
    for y in range(max(0, min_y), min(h - 1, max_y) + 1):
        xs = []
        n = len(points)
        for i in range(n):
            x1, y1 = points[i]
            x2, y2 = points[(i + 1) % n]
            if (y1 <= y < y2) or (y2 <= y < y1):
                if y2 != y1:
                    xs.append(x1 + (x2 - x1) * (y - y1) / (y2 - y1))
        xs.sort()
        for k in range(0, len(xs) - 1, 2):
            xa, xb = int(math.ceil(min(xs[k], xs[k + 1]))), int(math.floor(max(xs[k], xs[k + 1])))
            for x in range(max(0, xa), min(w - 1, xb) + 1):
                grid[y][x] = '#'
    return '\n'.join(''.join(row) for row in grid)


def centroid_and_avg_r(points):
    n = len(points)
    cxm = sum(p[0] for p in points) / n
    cym = sum(p[1] for p in points) / n
    r = sum(math.hypot(p[0] - cxm, p[1] - cym) for p in points) / n
    return math.floor(cxm), math.floor(cym), math.floor(r)


def emit_c_array(name, points):
    lines = [f"static const int16_t {name}[][2] = {{"]
    for x, y in points:
        lines.append(f"    {{{x},{y}}},")
    lines.append("};")
    return '\n'.join(lines)


def main():
    # 新几何（200 画布，与旧 MOON_POLY 同约定：0~200 缩放）
    pts, geom = moon_points(100, 80, 80, 70, 40, outer_steps=23, inner_steps=17)
    cx, cy, c2x, xi, yi = geom
    print("== 几何摘要 ==")
    print(f"外圆 (100,80) r=80 / 内圆 ({c2x},80) r=70 / 圆心距 40")
    print(f"交点: ({100+xi:.2f}, {80+yi:.2f}) / ({100+xi:.2f}, {80-yi:.2f})  月牙高≈{2*yi:.1f}")
    cxm, cym, cavg = centroid_and_avg_r(pts)
    print(f"顶点数: {len(pts)}   质心≈({cxm},{cym})   平均半径≈{cavg}")

    print("\n== 新轮廓渲染（200×200，已裁边）==")
    art = render(pts)
    lines = art.split('\n')
    # 裁剪空白
    filled = [l for l in lines if '#' in l]
    ys = [i for i, l in enumerate(lines) if '#' in l]
    y0, y1 = min(ys), max(ys)
    x0 = min(min(i for i, c in enumerate(l) if c == '#') for l in filled)
    x1 = max(max(i for i, c in enumerate(l) if c == '#') for l in filled)
    for l in lines[y0:y1 + 1]:
        print(' ' * 4 + l[x0:x1 + 1])

    print("\n== C 数组（可直接替换 MOON_POLY）==")
    print(emit_c_array('MOON_POLY', pts))


if __name__ == '__main__':
    main()