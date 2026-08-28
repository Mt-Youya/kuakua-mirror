# KuaKua Mirror Device Simulator

智能镜子设备模拟器 - 用于Backend/Frontend联调，无需等待真实硬件。

## 功能特性

- ✅ 完整模拟真实设备行为
- ✅ 设备激活流程（REST API）
- ✅ WebSocket连接和握手（device.hello/ready）
- ✅ 设备心跳（15秒间隔）
- ✅ Ping/Pong检测（10秒间隔）
- ✅ 人脸检测事件（face.detected/lost）
- ✅ 设备状态管理（idle/listening/thinking/speaking）
- ✅ 使用@kuakua/protocol统一协议

## 安装

```bash
cd tools/device-simulator
npm install
```

## 使用

### 开发模式（推荐）

```bash
npm run dev
```

### 构建并运行

```bash
npm run build
npm start
```

### 环境变量配置

```bash
# 自定义Backend地址
BACKEND_URL=http://localhost:8080 npm run dev

# 自定义设备ID
DEVICE_ID=mirror-simulator-002 npm run dev

# 自定义激活码
ACTIVATION_CODE=XYZ789 npm run dev

# 组合使用
BACKEND_URL=http://192.168.1.100:8080 \
DEVICE_ID=mirror-dev-001 \
ACTIVATION_CODE=DEV123 \
npm run dev
```

### 默认配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| BACKEND_URL | http://localhost:8080 | Backend地址 |
| DEVICE_ID | mirror-simulator-001 | 设备ID |
| ACTIVATION_CODE | ABC123 | 激活码 |
| firmwareVersion | simulator-v1.0.0 | 固件版本 |
| model | kuakua-mirror-simulator | 设备型号 |

## 模拟流程

### 1. 设备激活（REST API）
```
POST /api/v1/devices/activate
→ 获取deviceToken
```

### 2. WebSocket连接
```
连接 ws://localhost:8080/ws/device
→ 发送 device.hello
← 收到 device.ready (sessionId)
```

### 3. 心跳和Ping
```
每15秒: POST /api/v1/devices/{deviceId}/heartbeat
每10秒: WebSocket ping → pong
```

### 4. 人脸检测模拟
```
连接后5秒: 发送 face.detected (confidence: 0.94)
再过5秒: 发送 face.lost
```

### 5. 设备状态更新
```
发送 device.status (state: idle/listening/thinking/speaking)
```

## 输出示例

```
╔════════════════════════════════════════╗
║   KuaKua Mirror Device Simulator      ║
║   v1.0.0                               ║
╚════════════════════════════════════════╝

🚀 设备模拟器启动中...
   Device ID: mirror-simulator-001
   Backend: http://localhost:8080

📱 正在激活设备...
✅ 设备激活成功
   Device ID: device_1735344000000
   Token: a1b2c3d4e5f6g7h8i9j0...

🔌 正在连接WebSocket: ws://localhost:8080/ws/device
✅ WebSocket连接成功

📤 发送 device.hello
📥 收到消息: device.ready
✅ 设备已就绪
   Session ID: sess_1735344001234

💓 心跳已启动 (15000ms)
📡 Ping已启动 (10s)

✅ 模拟器运行中...
   按 Ctrl+C 停止

📡 Ping sent
📥 收到消息: pong
   📡 Pong received

👤 模拟人脸检测事件
   ✅ face.detected sent (confidence: 0.94)
   📊 状态更新: idle

💓 心跳已发送

   👋 face.lost sent

^C
⚠️  收到退出信号 (Ctrl+C)

🛑 正在停止设备模拟器...
🔌 WebSocket连接关闭
✅ 设备模拟器已停止
```

## 与真实设备的对应

| 功能 | 真实设备 | 模拟器 |
|------|---------|--------|
| 设备激活 | ESP32 HTTP请求 | axios HTTP请求 |
| WebSocket连接 | ESP32 WebSocket库 | ws库 |
| device.hello | ESP32发送JSON | 发送JSON |
| 心跳 | 定时器15s | setInterval 15s |
| Ping/Pong | WebSocket心跳 | 手动发送ping |
| 人脸检测 | Camera + AI芯片 | 定时模拟事件 |
| 设备状态 | 真实状态机 | 模拟状态机 |

## Phase 1 联调清单

使用此模拟器完成以下验证：

### Backend验证
- [ ] 设备激活API正常工作
- [ ] WebSocket连接成功建立
- [ ] device.hello/ready握手成功
- [ ] 心跳API正常接收
- [ ] Ping/Pong正常响应
- [ ] face.detected/lost正常接收
- [ ] device.status正常接收
- [ ] 设备会话管理正常
- [ ] Bearer Token认证正常

### Frontend验证（待实现）
- [ ] 实时显示设备在线状态
- [ ] 显示设备信息（deviceId, firmware）
- [ ] 显示实时事件流（hello/status/face）
- [ ] 显示心跳状态
- [ ] Debug Dashboard可用

## 下一步扩展

### 音频模拟
```typescript
// 模拟音频输入
simulateAudioInput() {
  const msg = {
    type: "audio.input.start",
    timestamp: Date.now(),
    payload: {
      streamId: "audio_in_001",
      format: "pcm_s16le",
      sampleRate: 16000,
      channels: 1,
    },
  };
  this.sendMessage(msg);
  
  // 发送Binary PCM数据...
}
```

### 摄像头模拟
```typescript
// 模拟摄像头拍照
async simulateCameraCapture() {
  // 响应camera.capture请求
  // 上传测试图片到/api/v1/devices/{deviceId}/images
}
```

## 故障排查

### WebSocket连接失败
```
❌ WebSocket错误: connect ECONNREFUSED
```
→ 检查Backend是否启动：`http://localhost:8080/api/health`

### 设备激活失败
```
❌ 设备激活失败: Request failed with status code 400
```
→ 检查activationCode是否有效
→ 检查Backend数据库连接

### 心跳失败
```
❌ 心跳失败: Request failed with status code 401
```
→ 检查Bearer Token是否正确
→ 检查Token是否过期

## 开发

```bash
# 安装依赖
npm install

# 开发模式（支持热重载）
npm run dev

# 构建
npm run build

# 清理
npm run clean
```

## License

MIT
