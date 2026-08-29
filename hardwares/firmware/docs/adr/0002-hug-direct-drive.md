### 背景

抱抱动画 v2 要求丝滑。性能实测(K10 平台)发现:LVGL Canvas 路线任何一笔绘制都会使整个 240×320 canvas 对象失效,导致每次刷新同步推满帧 153,600 字节(4 线 SPI @ 40MHz,无 DMA,约 33–38ms/帧),加上 LVGL 20ms 刷新门限,该路线帧率上限约 25 FPS;而 K10 的 8MB OPI PSRAM(80MHz,`CONFIG_SPIRAM_USE_MALLOC=1`)完全可用,固件可自建 TFT_eSPI 实例绕过 LVGL 直接推屏,按脏行带推送 65KB 级数据约 15ms,可达 55–60 FPS。

### 决策

抱抱动画期间停用 LVGL Canvas 渲染路径,自建 PSRAM 帧缓冲(240×320 RGB565)+ 独立 TFT_eSPI 实例直推,仅推送帧间变化的行带;动画结束后画待机页时恢复 Canvas 路径。两个推论:动画期间不调用任何 canvas 绘制与 updateCanvas(避免整帧覆盖直推内容);同时留意 `LV_COLOR_16_SWAP` 的字节序,直推缓冲需按 TFT 期望字节序生成。

### 状态

已采纳。Canvas 路径保留给现有页面(待机/拍照/处理/夸夸/错误),只有 Hug Animation 走直推路径。

### 后果

- 优点:丝滑(目标 ≥40FPS,可避开 LVGL 20ms 门限);帧缓冲仅一份 153.6KB PSRAM;文案淡入等效果可在自己管线内完整实现。
- 代价:新增一条独立上屏路径需自行维护(光栅器、时序、与 LVGL 的交接);两条推屏路径在同一 SPI 总线上串行使用,`updateCanvas` 与直推之间无锁互斥,依赖约定——动画期禁用全部 canvas API。
- 备选:沿用 Canvas 提高绘制频率,实测上限约 25FPS,无法满足"很丝滑";或整体迁移 esp_lcd + GDMA(收益更大但牵动力过高)。