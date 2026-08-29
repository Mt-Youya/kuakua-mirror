# KuaKua Mirror Device Simulator（旧协议原型）

该模拟器按 `@kuakua/protocol` 连接 WebSocket `/ws/device`，发送 `device.hello`、状态、人脸事件、Ping 和心跳。

当前 K10 已迁移到 Java HTTP/SSE 后端，未提供 `/ws/device`，因此该模拟器不能与 `apps/backend` 完成联调。

```bash
pnpm install
pnpm build
```

实际运行需要实现旧激活接口和 `/ws/device` 的兼容后端；当前仓库没有该运行目标。
