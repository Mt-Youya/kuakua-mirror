#!/bin/bash

# 设备 WebSocket 测试脚本
# 用于测试 /device/ws 端点

echo "========================================="
echo "设备 WebSocket 连接测试"
echo "========================================="
echo ""

# 检查 wscat 是否安装
if ! command -v wscat &> /dev/null; then
    echo "❌ wscat 未安装"
    echo ""
    echo "安装方法:"
    echo "  npm install -g wscat"
    echo ""
    exit 1
fi

# 默认服务器地址
SERVER_URL=${1:-"ws://localhost:8080/device/ws"}

echo "📡 连接到: $SERVER_URL"
echo ""
echo "测试消息示例:"
echo ""
echo "1. 发送设备信息:"
echo '   {"type":"device_info","deviceId":"mirror_001","firmwareVersion":"1.0.0","capabilities":["audio","display"]}'
echo ""
echo "2. 发送心跳:"
echo '   {"type":"heartbeat","timestamp":1234567890}'
echo ""
echo "3. 发送音频数据:"
echo '   {"type":"audio","data":"base64EncodedAudioData"}'
echo ""
echo "4. 发送音频结束:"
echo '   {"type":"audio_end"}'
echo ""
echo "========================================="
echo ""

# 连接 WebSocket
wscat -c "$SERVER_URL"
