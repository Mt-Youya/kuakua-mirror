# 工具目录

这里保留早期 NestJS WebSocket 联调工具：`test-device-client.py` 连接 `/device/ws`，`device-simulator/` 连接 `/ws/device`。

当前 K10 Java 后端不提供这些端点，所以它们不能验证 `apps/backend` 或真实固件；仅用于回溯旧协议原型。

当前链路请运行 `mvn -f ../apps/backend/pom.xml test`，再按 [K10 固件 README](../hardwares/firmware/README.md) 验证激活或凭证轮换、拍照夸夸、语音对话和授权 WAV 下载。
