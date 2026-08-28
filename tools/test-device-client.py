#!/usr/bin/env python3
"""
夸夸镜硬件设备 WebSocket 测试客户端

用途：
- 验证硬件协议实现
- 测试后端 WebSocket 端点
- 模拟硬件设备发送消息

使用方法：
    python test-device-client.py [--host HOST] [--port PORT] [--device-id DEVICE_ID]

示例：
    python test-device-client.py
    python test-device-client.py --host localhost --port 8080
    python test-device-client.py --device-id mirror_test_001
"""

import asyncio
import base64
import json
import logging
import sys
import time
import argparse
from typing import Optional

try:
    import websockets
except ImportError:
    print("错误: 缺少 websockets 库")
    print("请运行: pip install websockets")
    sys.exit(1)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)


class DeviceTestClient:
    """硬件设备测试客户端"""

    def __init__(self, host: str = "localhost", port: int = 8080, device_id: str = "test_device_001"):
        self.host = host
        self.port = port
        self.device_id = device_id
        self.ws_url = f"ws://{host}:{port}/device/ws"
        self.websocket: Optional[websockets.WebSocketClientProtocol] = None
        self.running = False

    async def connect(self):
        """建立 WebSocket 连接"""
        logger.info(f"正在连接到 {self.ws_url}")
        try:
            self.websocket = await websockets.connect(self.ws_url)
            logger.info("✓ WebSocket 连接成功")
            return True
        except Exception as e:
            logger.error(f"✗ 连接失败: {e}")
            return False

    async def send_message(self, message: dict):
        """发送消息到后端"""
        if not self.websocket:
            logger.error("WebSocket 未连接")
            return

        try:
            json_str = json.dumps(message, ensure_ascii=False)
            await self.websocket.send(json_str)
            logger.info(f"→ 发送: {message['type']}")
            logger.debug(f"   数据: {json_str}")
        except Exception as e:
            logger.error(f"✗ 发送消息失败: {e}")

    async def receive_messages(self):
        """接收后端消息"""
        if not self.websocket:
            return

        try:
            while self.running:
                try:
                    message = await asyncio.wait_for(self.websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    msg_type = data.get('type', 'unknown')
                    logger.info(f"← 收到: {msg_type}")
                    self.handle_message(data)
                except asyncio.TimeoutError:
                    continue
                except websockets.exceptions.ConnectionClosed:
                    logger.warning("WebSocket 连接已关闭")
                    break
        except Exception as e:
            logger.error(f"✗ 接收消息时出错: {e}")

    def handle_message(self, message: dict):
        """处理收到的消息"""
        msg_type = message.get('type')

        if msg_type == 'transcript':
            text = message.get('text', '')
            logger.info(f"   [转写] {text}")

        elif msg_type == 'response_text':
            text = message.get('text', '')
            logger.info(f"   [AI回复] {text}")

        elif msg_type == 'audio_response':
            data = message.get('data', '')
            is_final = message.get('isFinal', False)
            logger.info(f"   [音频] 长度={len(data)} isFinal={is_final}")

        elif msg_type == 'audio_response_end':
            logger.info(f"   [音频结束]")

        elif msg_type == 'error':
            code = message.get('code', 'UNKNOWN')
            msg = message.get('message', '')
            logger.error(f"   [错误] {code}: {msg}")

        elif msg_type == 'pong':
            timestamp = message.get('timestamp', 0)
            logger.debug(f"   [心跳响应] timestamp={timestamp}")

        else:
            logger.debug(f"   数据: {json.dumps(message, ensure_ascii=False)}")

    async def send_device_info(self):
        """发送设备信息"""
        message = {
            "type": "device_info",
            "deviceId": self.device_id,
            "firmwareVersion": "1.0.0",
            "capabilities": ["audio", "display", "button"]
        }
        await self.send_message(message)

    async def send_heartbeat(self):
        """发送心跳"""
        message = {
            "type": "heartbeat",
            "timestamp": int(time.time() * 1000)
        }
        await self.send_message(message)

    async def send_mock_audio(self, duration_ms: int = 1000):
        """发送模拟音频数据

        Args:
            duration_ms: 音频时长（毫秒）
        """
        # 音频参数
        sample_rate = 24000  # 24kHz
        bytes_per_sample = 2  # 16-bit
        chunk_duration_ms = 200  # 每块 200ms

        # 计算参数
        samples_per_chunk = int(sample_rate * chunk_duration_ms / 1000)
        bytes_per_chunk = samples_per_chunk * bytes_per_sample
        num_chunks = int(duration_ms / chunk_duration_ms)

        logger.info(f"开始发送音频数据: {duration_ms}ms, {num_chunks} 块")

        for i in range(num_chunks):
            # 生成模拟音频数据（静音）
            audio_bytes = b'\x00' * bytes_per_chunk

            # Base64 编码
            base64_data = base64.b64encode(audio_bytes).decode('utf-8')

            # 发送音频块
            message = {
                "type": "audio",
                "data": base64_data
            }
            await self.send_message(message)

            # 模拟真实发送间隔
            await asyncio.sleep(chunk_duration_ms / 1000)

        # 发送音频结束标志
        await self.send_message({"type": "audio_end"})
        logger.info("音频数据发送完成")

    async def heartbeat_loop(self):
        """心跳循环"""
        while self.running:
            await asyncio.sleep(30)
            if self.running:
                await self.send_heartbeat()

    async def run_test(self):
        """运行测试流程"""
        if not await self.connect():
            return

        self.running = True

        # 启动消息接收任务
        receive_task = asyncio.create_task(self.receive_messages())

        # 启动心跳任务
        heartbeat_task = asyncio.create_task(self.heartbeat_loop())

        try:
            # 1. 发送设备信息
            logger.info("=" * 60)
            logger.info("测试步骤 1: 发送设备信息")
            logger.info("=" * 60)
            await self.send_device_info()
            await asyncio.sleep(1)

            # 2. 发送心跳
            logger.info("=" * 60)
            logger.info("测试步骤 2: 发送心跳")
            logger.info("=" * 60)
            await self.send_heartbeat()
            await asyncio.sleep(2)

            # 3. 发送模拟音频
            logger.info("=" * 60)
            logger.info("测试步骤 3: 发送模拟音频数据")
            logger.info("=" * 60)
            await self.send_mock_audio(duration_ms=2000)
            await asyncio.sleep(2)

            # 4. 等待响应
            logger.info("=" * 60)
            logger.info("等待后端响应...")
            logger.info("按 Ctrl+C 退出")
            logger.info("=" * 60)
            await asyncio.sleep(10)

        except KeyboardInterrupt:
            logger.info("\n收到中断信号，正在退出...")
        finally:
            self.running = False
            heartbeat_task.cancel()
            receive_task.cancel()

            if self.websocket:
                await self.websocket.close()
                logger.info("WebSocket 连接已关闭")


async def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='夸夸镜硬件设备 WebSocket 测试客户端',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s
  %(prog)s --host localhost --port 8080
  %(prog)s --device-id mirror_test_001
  %(prog)s --verbose
        """
    )
    parser.add_argument('--host', default='localhost', help='后端服务器地址 (默认: localhost)')
    parser.add_argument('--port', type=int, default=8080, help='后端服务器端口 (默认: 8080)')
    parser.add_argument('--device-id', default='test_device_001', help='设备 ID (默认: test_device_001)')
    parser.add_argument('--verbose', '-v', action='store_true', help='显示详细日志')

    args = parser.parse_args()

    if args.verbose:
        logger.setLevel(logging.DEBUG)

    print("""
╔══════════════════════════════════════════════════════════╗
║         夸夸镜硬件设备 WebSocket 测试客户端              ║
╚══════════════════════════════════════════════════════════╝
    """)
    print(f"服务器: {args.host}:{args.port}")
    print(f"设备 ID: {args.device_id}")
    print()

    client = DeviceTestClient(
        host=args.host,
        port=args.port,
        device_id=args.device_id
    )

    await client.run_test()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n程序已退出")
