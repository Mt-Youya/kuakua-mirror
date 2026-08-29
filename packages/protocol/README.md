# @kuakua/protocol

保留的 TypeScript WebSocket 协议原型，定义 `device.hello`、设备状态、人脸、音频和视觉消息的类型与 Zod Schema，并被 `tools/device-simulator` 使用。

它不是当前 K10 生产协议：当前固件与 `apps/backend` 使用 HTTP/SSE、Device Token 和 16 kHz WAV。不要用本包的 `/ws/device` 或 `/v1/realtime` 常量为 K10 新功能建链路。

```bash
pnpm build
pnpm test
```
