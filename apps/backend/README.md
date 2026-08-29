# K10 后端

当前 UNIHIKER K10 使用的 Java 21 / Spring Boot 服务。设备只持有 Device Token；百炼凭证仅从服务端环境变量读取。

```bash
export DASHSCOPE_API_KEY='...'
export DASHSCOPE_TTS_VOICE='...'
mvn test
mvn spring-boot:run
```

服务默认监听 `http://localhost:8080`，健康检查为 `GET /api/health`。K10 使用 `POST /api/v1/praise/stream`（JPEG Base64）和 `POST /api/v1/chat/stream`（16 kHz、单声道、PCM16 WAV）；SSE 返回 `status`、`text`、`audio`、`complete` 或 `error`。

`GET /api/v1/audio/{filename}` 必须由同一设备的 Bearer Token 下载，临时 WAV 默认十分钟清理。流式请求中的 Token、`X-Device-ID` 和请求体 `device_id` 必须为同一设备。其余设备、制品与 OTA 接口以 [OpenAPI Schema](../../packages/api-docs/openapi.json) 为准。
