#!/bin/bash

# ConversationController API 测试脚本

BASE_URL="http://localhost:8080/api/conversations"

echo "=========================================="
echo "测试 ConversationController REST API"
echo "=========================================="

echo ""
echo "1. 创建会话"
echo "POST $BASE_URL"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "momentId": 1
  }' | jq '.'

echo ""
echo ""
echo "2. 发送消息并获取 AI 回复"
echo "POST $BASE_URL/1/messages"
curl -X POST "$BASE_URL/1/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "今天完成了一个重要的项目，感觉很有成就感！"
  }' | jq '.'

echo ""
echo ""
echo "3. 查询历史消息（默认20条）"
echo "GET $BASE_URL/1/messages"
curl -X GET "$BASE_URL/1/messages" | jq '.'

echo ""
echo ""
echo "4. 查询历史消息（限制10条）"
echo "GET $BASE_URL/1/messages?limit=10"
curl -X GET "$BASE_URL/1/messages?limit=10" | jq '.'

echo ""
echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
