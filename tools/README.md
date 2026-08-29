# 测试工具

## 硬件设备 WebSocket 测试客户端

### 功能

`test-device-client.py` 是一个用于测试夸夸镜硬件协议的 WebSocket 客户端，可以：

- 连接到后端 WebSocket 端点 `/device/ws`
- 发送设备注册信息 (`device_info`)
- 发送心跳消息 (`heartbeat`)
- 发送模拟音频数据 (`audio`, `audio_end`)
- 接收并打印后端返回的所有消息

### 安装依赖

```bash
cd tools
pip install -r requirements.txt
```

或者直接安装：

```bash
pip install websockets
```

### 使用方法

#### 基本用法

连接到本地后端服务器（默认 localhost:8080）：

```bash
python test-device-client.py
```

#### 指定服务器地址

```bash
python test-device-client.py --host localhost --port 8080
```

#### 指定设备 ID

```bash
python test-device-client.py --device-id mirror_test_123
```

#### 显示详细日志

```bash
python test-device-client.py --verbose
```

### 测试流程

脚本会自动执行以下测试步骤：

1. **建立 WebSocket 连接** - 连接到 `/device/ws`
2. **发送设备信息** - 注册设备（device_info）
3. **发送心跳** - 测试心跳机制（heartbeat）
4. **发送模拟音频** - 发送 2 秒的模拟音频数据（静音）
5. **接收响应** - 持续接收并打印后端返回的消息
6. **保持连接** - 每 30 秒发送心跳保持连接

### 输出示例

```
╔══════════════════════════════════════════════════════════╗
║         夸夸镜硬件设备 WebSocket 测试客户端              ║
╚══════════════════════════════════════════════════════════╝

服务器: localhost:8080
设备 ID: test_device_001

14:30:15 [INFO] 正在连接到 ws://localhost:8080/device/ws
14:30:15 [INFO] ✓ WebSocket 连接成功
============================================================
测试步骤 1: 发送设备信息
============================================================
14:30:15 [INFO] → 发送: device_info
============================================================
测试步骤 2: 发送心跳
============================================================
14:30:16 [INFO] → 发送: heartbeat
14:30:16 [INFO] ← 收到: pong
14:30:16 [INFO]    [心跳响应] timestamp=1693234567891
============================================================
测试步骤 3: 发送模拟音频数据
============================================================
14:30:18 [INFO] 开始发送音频数据: 2000ms, 10 块
14:30:18 [INFO] → 发送: audio
14:30:18 [INFO] → 发送: audio
...
14:30:20 [INFO] → 发送: audio_end
14:30:20 [INFO] 音频数据发送完成
14:30:20 [INFO] ← 收到: transcript
14:30:20 [INFO]    [转写] (静音，无转写结果)
============================================================
等待后端响应...
按 Ctrl+C 退出
============================================================
```

### 退出

按 `Ctrl+C` 退出测试客户端。

### 注意事项

1. 确保后端服务器已启动并运行在指定端口
2. 模拟音频数据为静音（全零），不会产生实际的语音识别结果
3. 测试脚本会自动处理 WebSocket 连接断开和错误
4. 心跳默认每 30 秒发送一次

### 故障排除

#### 连接失败

```
✗ 连接失败: [Errno 61] Connection refused
```

**解决方法**：

- 检查后端服务器是否已启动
- 确认端口号是否正确（默认 8080）
- 检查防火墙设置

#### 缺少 websockets 库

```
错误: 缺少 websockets 库
请运行: pip install websockets
```

**解决方法**：

```bash
pip install websockets
```

#### 后端返回错误

```
← 收到: error
   [错误] INTERNAL_ERROR: ...
```

**解决方法**：

- 查看后端日志了解详细错误信息
- 检查发送的消息格式是否正确
- 确认协议版本是否匹配

## 开发指南

### 修改测试脚本

测试脚本采用 Python 异步编程（asyncio），主要类和方法：

- `DeviceTestClient`: 测试客户端主类
  - `connect()`: 建立 WebSocket 连接
  - `send_message()`: 发送消息
  - `receive_messages()`: 接收消息
  - `handle_message()`: 处理收到的消息
  - `send_device_info()`: 发送设备信息
  - `send_heartbeat()`: 发送心跳
  - `send_mock_audio()`: 发送模拟音频
  - `run_test()`: 运行测试流程

### 自定义测试流程

修改 `run_test()` 方法来自定义测试流程：

```python
async def run_test(self):
    if not await self.connect():
        return

    self.running = True
    receive_task = asyncio.create_task(self.receive_messages())
    heartbeat_task = asyncio.create_task(self.heartbeat_loop())

    try:
        # 自定义测试步骤
        await self.send_device_info()
        await asyncio.sleep(1)

        # 发送更长的音频
        await self.send_mock_audio(duration_ms=5000)

        # 等待更长时间
        await asyncio.sleep(30)

    finally:
        self.running = False
        heartbeat_task.cancel()
        receive_task.cancel()
        if self.websocket:
            await self.websocket.close()
```

### 添加真实音频测试

要使用真实音频文件而不是静音：

```python
import wave

def load_audio_file(filepath: str) -> bytes:
    """加载 WAV 音频文件"""
    with wave.open(filepath, 'rb') as wav:
        # 确认格式：24kHz, 16-bit, Mono
        assert wav.getframerate() == 24000
        assert wav.getsampwidth() == 2
        assert wav.getnchannels() == 1
        return wav.readframes(wav.getnframes())

async def send_real_audio(self, filepath: str):
    """发送真实音频文件"""
    audio_data = load_audio_file(filepath)
    chunk_size = 4800  # 200ms

    for i in range(0, len(audio_data), chunk_size):
        chunk = audio_data[i:i + chunk_size]
        base64_data = base64.b64encode(chunk).decode('utf-8')
        await self.send_message({"type": "audio", "data": base64_data})
        await asyncio.sleep(0.2)

    await self.send_message({"type": "audio_end"})
```

## 相关文档

- [硬件协议文档](../docs/硬件协议文档.md)
- [ADR-003: 硬件简化协议设计](../docs/adr/003-device-simplified-protocol.md)
