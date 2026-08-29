# 夸夸镜 API 使用文档

## 核心端点

### POST /api/praise-mirror/generate

完整的夸夸镜管线：照片 → 视觉分析 → 对话洞察 → 夸夸句生成 → 语音合成

**请求体：**
```json
{
  "imageData": "data:image/jpeg;base64,/9j/4AAQ...",  // 或图片 URL
  "dialogueText": "我今天心情不太好，但还是化了妆",  // 可选
  "useCache": false  // 暂未实现预计算缓存
}
```

**响应：**
```json
{
  "praiseSentence": "我今天的眼神好坚定！",
  "audioUrl": "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/xxx.mp3",
  "visualTags": {
    "expression": ["微笑", "眼神坚定"],
    "clothing": ["休闲装"],
    "accessories": ["耳环"],
    "hair_makeup": ["淡妆", "直发"],
    "posture": ["正面", "近距离"],
    "lighting": ["自然光", "柔和"],
    "emotional_valence": "积极",
    "current_state": "平静专注"
  },
  "voiceInsights": {
    "insights": ["用户提到心情不好但仍然化妆，显示出积极的自我关爱态度"],
    "values_shown": ["自律", "自我关爱"],
    "mood": "略低落但积极应对",
    "praise_angles": ["坚持、态度、眼神"]
  },
  "passedValidation": true,
  "retryCount": 0,
  "processingTimeMs": 2847,
  "isFallback": false
}
```

### GET /api/praise-mirror/prompts/{stage}

获取指定阶段的提示词（调试用）

**参数：**
- `stage`: `p1` | `p_voice` | `p2`

**示例：**
```bash
curl http://localhost:8080/api/praise-mirror/prompts/p1
```

### POST /api/praise-mirror/validate

验证夸夸句是否符合规范（调试用）

**请求体：**
```json
"我今天的眼神好坚定！"
```

**响应：**
```json
{
  "passed": true,
  "errors": []
}
```

或未通过：
```json
{
  "passed": false,
  "errors": [
    "超过字数，必须20字以内",
    "有建议词，只夸不建议"
  ]
}
```

## 配置要求

在 `application.yml` 或 `application.properties` 中配置：

```yaml
llm:
  api:
    base-url: https://dashscope.aliyuncs.com/compatible-mode/v1
    key: ${DASHSCOPE_API_KEY}  # 阿里云百炼 API Key
```

或使用环境变量：
```bash
export DASHSCOPE_API_KEY="sk-xxx"
```

## 管线架构

```
照片输入
  ↓
┌─────────────────┬─────────────────┐
│  P1 视觉标签     │  P_voice 对话    │  ← 并行执行
│  (qwen-vl-max)  │  (qwen-max)     │
└────────┬────────┴────────┬────────┘
         └────────┬─────────┘
                  ↓
         P2 融合夸夸 (qwen-max)
                  ↓
         输出闸门验证（9项规则）
                  ↓
         ✓ 通过 → TTS 语音合成
         ✗ 不过 → 重跑（最多2次）
                  ↓
         仍不过 → 兜底句
```

## 质量闸门规则

1. **字数**：≤20字（不含标点）
2. **人称**：必须含"我"或"自己"
3. **禁止"你"**：不许出现"你"字
4. **不建议**：不含"可以、试试、应该、加油、建议、记得、别忘"
5. **不套话**：不含"看起来不错、状态很好、今天也要、心情不错"
6. **夸人不夸物**：不夸具体物品（耳环、项链等）
7. **禁用词**：不含"魅力、迷人、性感、温柔、俏皮"等
8. **不套路**：不中"我...的样子好...！"句式
9. **不观后感**：不含"感觉、觉得"

## 测试示例

```bash
# 1. 基础测试（仅图片）
curl -X POST http://localhost:8080/api/praise-mirror/generate \
  -H "Content-Type: application/json" \
  -d '{
    "imageData": "https://example.com/photo.jpg"
  }'

# 2. 完整测试（图片 + 对话）
curl -X POST http://localhost:8080/api/praise-mirror/generate \
  -H "Content-Type: application/json" \
  -d '{
    "imageData": "data:image/jpeg;base64,...",
    "dialogueText": "我今天起得好早，看了会书"
  }'

# 3. 验证测试
curl -X POST http://localhost:8080/api/praise-mirror/validate \
  -H "Content-Type: application/json" \
  -d '"我今天的笑容好灿烂！"'
```

## 性能指标

- **P1 视觉**：~800ms
- **P_voice 对话**：~600ms（并行）
- **P2 夸夸**：~1200ms
- **TTS 合成**：~400ms
- **总耗时**：~2.5-3s（含重跑）

## 兜底策略

当夸夸句经过 3 次生成仍未通过验证时，使用以下兜底句之一（随机）：
- "我又见面啦！"
- "每次照镜子都有新发现！"
- "今天也是独一无二的我！"

## 调试建议

1. **查看提示词**：`GET /prompts/{stage}` 检查加载是否正确
2. **验证夸夸句**：`POST /validate` 单独测试闸门规则
3. **查看日志**：注意 `retryCount` 和 `isFallback` 字段
4. **测试视觉标签**：先用简单图片测试 P1 是否正常
5. **测试对话洞察**：用短对话测试 P_voice 逻辑

## 已知限制

- **预计算缓存**：当前未实现，每次都是实时计算
- **并发控制**：未做流控，高并发下可能触发 API 限流
- **图片大小**：建议 < 5MB，过大会影响上传速度
- **对话长度**：自动截断到 500 字
