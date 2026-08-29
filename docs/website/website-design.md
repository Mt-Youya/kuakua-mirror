# 夸夸镜 Website Design Specification

> Version: 1.0  
> 网站类型：品牌 Storytelling + Product Landing + AI Experience  
> 核心视觉关键词：Soft / Warm / Premium / Minimal / Emotional / Human / Mirror / Reflection / Light

---

# 1. 网站目标

网站必须同时完成四件事情：

```txt
建立品牌情绪
      ↓
解释产品
      ↓
让用户实际体验夸夸
      ↓
推动分享 / Waitlist
```

不要做成传统 SaaS 官网。

不要第一屏展示：

- LLM
- Camera
- CV
- API
- Wi-Fi
- Bluetooth

这些是技术能力，不是第一价值。

---

# 2. 网站信息架构

```txt
/
├── Home
├── Mirror
├── Compliment
├── About
├── Privacy
└── Waitlist
```

MVP：

```txt
/
├── /
├── /mirror
├── /compliment
└── /about
```

---

# 3. 首页整体结构

```txt
01 Hero
02 Problem Storytelling
03 Emotional Conflict
04 Product Reveal
05 Interactive Demo
06 Capabilities
07 Brand Philosophy
08 Daily Scenarios
09 Online Compliment
10 Privacy
11 Brand Story
12 Final CTA
```

---

# 4. Hero

## Headline

# 这一次，

# 镜子站在你这边。

## Subheadline

> 一面能够看见你、听见你，也会在适当的时候夸夸你的 AI 镜子。

CTA：

- 认识夸夸镜
- 先让我夸夸你

## Hero Visual

中央：

- 高质量夸夸镜产品渲染
- 柔光
- 镜面反射
- 极少背景元素

镜面文字：

> 今天看起来很有精神呀。

几秒后：

> 而且这个发型真的挺适合你。

---

# 5. Problem Storytelling

标题：

# 我们每天都会照很多次镜子。

滚动逐条出现：

```txt
看头发。
看皮肤。
看身材。
看黑眼圈。
看自己哪里不够好。
```

最后：

# 但我们很少在照镜子的时候，

# 夸夸自己。

推荐：

- Full-screen section
- Scroll-controlled typography
- 镜面渐变
- 极少 UI 元素

---

# 6. Product Reveal

转场：

镜面从普通反射逐渐出现 AI 文本。

标题：

# 所以，我们做了一面会夸你的镜子。

镜子从远景进入中央。

可以使用：

- GSAP ScrollTrigger
- React Three Fiber
- Motion

---

# 7. AI Demo

建议做一段 15～30 秒的产品交互。

用户：

> 可是我昨天没睡好。

镜子：

> 看出来有一点累。

停顿。

> 但今天不用什么事情都做到满分。

最后：

> 已经很好了。

Demo 需要体现：

- 不强行夸
- 先理解
- 再回应
- 语言自然
- 有停顿

---

# 8. Capabilities

标题：

# 一面真正会「看见你」的镜子。

## 看见你

Vision：

- 用户存在
- 表情
- 发型
- 穿搭
- 大致状态

不要使用：

> 颜值识别

推荐：

> 视觉理解

## 听见你

- Microphone
- Voice Activity Detection
- STT

## 理解你

- LLM
- Context
- Memory

## 夸夸你

结合真实上下文。

## 记得你

长期陪伴能力。

---

# 9. Brand Philosophy

标题：

# 我们不希望你变得更完美。

大字：

# 我们希望你少讨厌自己一点。

下面：

> 夸夸镜不会给你的颜值打分。

> 不会告诉你应该瘦多少。

> 不会告诉你应该成为谁。

最后：

# 你已经很好了。

---

# 10. Daily Scenarios

推荐横向滚动。

场景：

## Morning

> 早呀，今天看起来挺有精神。

## Going Out

> 这身真的挺适合你的。

## After Work

> 今天辛苦了。

## Low Mood

用户：

> 今天感觉什么都做不好。

镜子：

> 那今天就不用要求自己什么都做好。

## Good Night

> 今天已经结束了，剩下的明天再处理。

---

# 11. Online Compliment

标题：

# 现在，就让我夸夸你。

输入：

```txt
今天发生了什么？
```

示例：

> 今天开会的时候说错话了，感觉自己好蠢。

AI：

> 一次表达没做好，并不代表你不擅长表达。
> 而且你会在意这件事情，本身就说明你很认真地对待自己的工作。

Buttons：

- 再夸我一句
- 收藏
- 分享

---

# 12. 分享卡片

生成：

```txt
今天有人对我说：

「你不需要一直表现得很好，
也值得被喜欢。」

—— 夸夸镜
```

尺寸支持：

- 1080 × 1440
- 1080 × 1920
- 1200 × 630

---

# 13. Privacy Section

标题：

# 你的镜子，只属于你。

需要清晰展示：

- Camera 状态
- Microphone 状态
- Data Retention
- Memory Control
- Delete History
- Physical Controls

视觉应该非常克制、可信。

---

# 14. Final CTA

标题：

# 今天，也记得喜欢自己一次。

Buttons：

- 加入 Waitlist
- 体验在线夸夸

---

# 15. 视觉系统

## Background

```css
--background: #faf8f5;
```

## Foreground

```css
--foreground: #292526;
```

## Soft Pink

```css
--soft-pink: #e8cacc;
```

## Pearl

```css
--pearl: #f3efea;
```

## Purple

```css
--accent: #c5a7d8;
```

## Gray

```css
--soft-gray: #d9d6d2;
```

---

# 16. 禁止视觉

避免：

- Barbie 粉
- 大面积高饱和紫
- 爱心元素堆砌
- 蝴蝶结少女感
- Cyberpunk AI
- 蓝紫霓虹
- 科幻 HUD

---

# 17. 材质语言

使用：

- Glass
- Reflection
- Blur
- Bloom
- Glow
- Frosted Glass
- Pearl
- Chrome
- Soft Shadow

原则：

> 未来感应该是柔和的，不应该像科技展厅。

---

# 18. Typography

中文：

- HarmonyOS Sans
- MiSans
- OPPO Sans
- Source Han Sans

情绪型标题可以探索 Serif。

英文：

- Geist
- Inter
- Instrument Sans
- Instrument Serif

---

# 19. Layout

Desktop：

- max-width: 1440px
- content-width: 1200～1280px
- 大量留白
- Hero 接近 100vh

Mobile：

- 保留故事节奏
- 不强制复制桌面 Three.js
- 优先内容和流畅度
- 简化重型 3D 效果

---

# 20. Motion Principles

动效必须：

- 慢
- 柔
- 有呼吸感
- 不抢内容
- 不制造眩晕

推荐：

```txt
Opacity
Blur
Scale 0.96 → 1
Light sweep
Reflection shift
Slow parallax
```

避免：

- 高频弹跳
- 快速旋转
- 大量粒子爆炸
- 过度鼠标跟随

---

# 21. Three.js 使用

推荐只使用在：

- Hero Product
- Product Reveal
- Mirror Interactive Demo

不要全站 Three.js。

推荐：

```txt
Three.js
React Three Fiber
Drei
GSAP
Motion
```

---

# 22. 响应式优先级

Priority：

```txt
Copy
↓
Interaction
↓
Image
↓
3D
```

移动端性能不足时，3D 可以降级为：

- Product render video
- WebM
- Image sequence
- Static render

---

# 23. 参考站搜索关键词

在 Awwwards / Recent / Land-book / Lapa Ninja 搜索：

```txt
Self Care
Emotional Wellness
Affirmation
Self Love
Women Wellness
Soft Minimalism
Beauty Tech
AI Hardware
Companion Device
Mirror
Reflection
Editorial
Personal AI
```
