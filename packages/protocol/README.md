# @kuakua/protocol

KuaKua Mirror设备通信协议的唯一事实来源。

## 特性

- ✅ TypeScript类型定义
- ✅ Zod Schema验证
- ✅ WebSocket消息格式统一
- ✅ Device/Audio/Vision协议完整定义
- ✅ 与Backend共享Protocol Contract

## 安装

```bash
npm install @kuakua/protocol
# or
yarn add @kuakua/protocol
```

## 使用

### TypeScript类型

```typescript
import { DeviceHelloMessage, DeviceStatus, AudioInputStartMessage, DEFAULT_AUDIO_CONFIG } from "@kuakua/protocol"

// 创建device.hello消息
const helloMsg: DeviceHelloMessage = {
  type: "device.hello",
  timestamp: Date.now(),
  payload: {
    deviceId: "mirror-001",
    firmwareVersion: "1.0.0",
    protocolVersion: "1.0",
    capabilities: ["microphone", "speaker", "camera"],
  },
}
```

### Zod验证

```typescript
import { DeviceHelloSchema, validateMessage, safeValidateMessage } from "@kuakua/protocol"

// 验证消息（抛出异常）
const validated = validateMessage(DeviceHelloSchema, unknownData)

// 安全验证（返回结果）
const result = safeValidateMessage(DeviceHelloSchema, unknownData)
if (result.success) {
  console.log("Valid:", result.data)
} else {
  console.error("Invalid:", result.error)
}
```

### 常量

```typescript
import { PROTOCOL_VERSION, DEFAULT_AUDIO_CONFIG, HEARTBEAT_CONFIG, WS_ENDPOINTS } from "@kuakua/protocol"

console.log(PROTOCOL_VERSION) // "1.0"
console.log(DEFAULT_AUDIO_CONFIG.sampleRate) // 16000
console.log(HEARTBEAT_CONFIG.interval) // 15000
console.log(WS_ENDPOINTS.device) // "/ws/device"
```

## 目录结构

```
packages/protocol/
├── src/
│   ├── types/
│   │   ├── common.ts       (通用类型)
│   │   └── enums.ts        (枚举定义)
│   ├── messages/
│   │   ├── device.ts       (设备消息)
│   │   ├── audio.ts        (音频消息)
│   │   ├── vision.ts       (视觉消息)
│   │   └── error.ts        (错误消息)
│   ├── schemas/
│   │   └── validation.ts   (Zod Schema)
│   └── index.ts            (主导出)
├── package.json
├── tsconfig.json
└── README.md
```

## 消息类型

### Device Messages

- `device.hello` - 设备连接握手
- `device.ready` - Backend握手响应
- `device.status` - 设备状态更新
- `face.detected` - 检测到人脸
- `face.lost` - 人脸丢失
- `ping` / `pong` - 心跳检测

### Audio Messages

- `audio.input.start` - 开始音频输入
- `audio.input.end` - 结束音频输入
- `transcript.final` - STT转录结果
- `assistant.text` - AI回复文本
- `audio.output.start` - 开始音频输出
- `audio.output.end` - 结束音频输出

### Vision Messages

- `camera.capture` - 请求拍照
- `capture.started` - 拍照开始
- `capture.completed` - 拍照完成
- `capture.failed` - 拍照失败
- `vision.result` - 视觉识别结果

### Error Messages

- `error` - 统一错误消息

## 开发

```bash
# 构建
npm run build

# 开发模式（watch）
npm run dev

# 测试
npm test

# Lint
npm run lint
```

## License

MIT
