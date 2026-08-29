# 夸夸镜（KuaKua Mirror）

UNIHIKER K10 的 AI 情绪陪伴原型：短按 A 拍照夸夸，长按 A 语音对话；Java 后端以 SSE 返回文字与 WAV 音频。

## 当前链路

- `apps/backend`：当前 Java K10 后端，负责设备认证、图像夸夸、语音对话、临时音频、制品与 OTA。
- `hardwares/firmware`：当前 K10 固件，媒体仅在 RAM 中保存至请求结束。
- `apps/h5`：离线 H5 演示，使用本地虚拟数据。
- `apps/web`：品牌页、OpenAPI 浏览页及旧监控原型；监控依赖当前 K10 后端未提供的旧 SSE。
- `apps/service`、`packages/protocol`、`tools`：保留的 NestJS/WebSocket 原型，非当前 K10 链路。

## 快速验证

```bash
export DASHSCOPE_API_KEY='...'
export DASHSCOPE_TTS_VOICE='...'
mvn -f apps/backend/pom.xml test
mvn -f apps/backend/pom.xml spring-boot:run
curl http://localhost:8080/api/health
```

接口定义见 [OpenAPI Schema](packages/api-docs/openapi.json)，硬件操作见 [固件 README](hardwares/firmware/README.md)。运行环境：Java 21、Maven 3.6+、Node.js 24+、pnpm 11+、PlatformIO 与 UNIHIKER K10。
