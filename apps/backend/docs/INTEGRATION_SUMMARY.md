# 夸夸镜后端集成方案总结

## ✅ 已完成

### 1. 核心服务层
- **[PraiseMirrorService.java](../src/main/java/com/kuakua/service/PraiseMirrorService.java)**
  - 从 `praise-mirror-pipeline.skill` (ZIP格式) 加载提示词配方
  - 解析 SKILL.md 提取三个阶段的 system prompts
  - 提供9项质量闸门验证
  - 提供兜底句和重跑指令生成

- **[LLMClientService.java](../src/main/java/com/kuakua/service/LLMClientService.java)**
  - 封装阿里云百炼平台 API 调用
  - 支持视觉模型 (qwen-vl-max)
  - 支持文本模型 (qwen-max)
  - 支持 TTS 语音合成 (qwen3-tts-flash)

### 2. API 控制器
- **[PraiseMirrorController.java](../src/main/java/com/kuakua/controller/PraiseMirrorController.java)**
  - `POST /api/praise-mirror/generate` - 完整管线入口
  - `GET /api/praise-mirror/prompts/{stage}` - 获取提示词（调试）
  - `POST /api/praise-mirror/validate` - 验证夸夸句质量（调试）

### 3. DTO 和配置
- **[PraiseMirrorRequest.java](../src/main/java/com/kuakua/dto/PraiseMirrorRequest.java)** - 请求体
- **[PraiseMirrorResponse.java](../src/main/java/com/kuakua/dto/PraiseMirrorResponse.java)** - 响应体
- **[RestTemplateConfig.java](../src/main/java/com/kuakua/config/RestTemplateConfig.java)** - HTTP 客户端配置
- **[application-example.yml](../src/main/resources/application-example.yml)** - 配置模板

### 4. 文档
- **[praise-mirror-api.md](praise-mirror-api.md)** - 完整 API 使用文档

## 🎯 核心特性

### 三阶段 LLM 管线
```
P1 视觉标签 (qwen-vl-max, 并行)
  ↓
P_voice 对话洞察 (qwen-max, 并行)
  ↓
P2 融合夸夸 (qwen-max, temp=0.95)
  ↓
输出闸门验证（9项规则）
  ↓
TTS 语音合成 (qwen3-tts-flash)
```

### 质量保证
- **9项输出闸门**：字数、人称、禁用词、句式等
- **自动重跑**：最多重试2次，附带具体修正指令
- **兜底机制**：3次都不过则使用预设安全句

### 性能优化
- **并行执行**：P1 和 P_voice 同时跑，节省时间
- **总耗时**：~2.5-3秒（含验证和重跑）

## 📋 使用方式

### 方式一：通过 REST API（推荐生产环境）

```bash
curl -X POST http://localhost:8080/api/praise-mirror/generate \
  -H "Content-Type: application/json" \
  -d '{
    "imageData": "https://example.com/selfie.jpg",
    "dialogueText": "我今天很开心"
  }'
```

### 方式二：通过 Claude Code 技能（推荐开发调试）

```bash
# 安装到 Claude 技能目录
cp apps/backend/src/main/resources/praise-mirror-pipeline.skill \
   ~/.claude/skills/

# 在 Claude Code 中使用
/praise-mirror-pipeline
```

### 方式三：直接集成到 Java 代码

```java
@Autowired
private PraiseMirrorService praiseMirrorService;

@Autowired
private LLMClientService llmClient;

// 获取 P2 提示词
String prompt = praiseMirrorService.getP2PraisePrompt(visualTags, insights, dialogue);

// 调用大模型
JsonNode response = llmClient.callTextModel("qwen-max", prompt, null, 0.95, 40);

// 验证输出
List<String> errors = praiseMirrorService.validatePraise(response.asText());
```

## 🔧 配置要求

```yaml
llm:
  api:
    base-url: https://dashscope.aliyuncs.com/compatible-mode/v1
    key: ${DASHSCOPE_API_KEY}
```

环境变量：
```bash
export DASHSCOPE_API_KEY="sk-xxx"
```

## 🧪 测试步骤

```bash
# 1. 验证提示词加载
curl http://localhost:8080/api/praise-mirror/prompts/p1

# 2. 测试质量闸门
curl -X POST http://localhost:8080/api/praise-mirror/validate \
  -H "Content-Type: application/json" \
  -d '"我今天的笑容好灿烂！"'

# 3. 完整管线测试
curl -X POST http://localhost:8080/api/praise-mirror/generate \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

## 📦 文件清单

```
apps/backend/
├── src/main/java/com/kuakua/
│   ├── controller/
│   │   └── PraiseMirrorController.java      # API 端点
│   ├── service/
│   │   ├── PraiseMirrorService.java         # 核心管线服务
│   │   └── LLMClientService.java            # 大模型客户端
│   ├── dto/
│   │   ├── PraiseMirrorRequest.java         # 请求 DTO
│   │   └── PraiseMirrorResponse.java        # 响应 DTO
│   └── config/
│       └── RestTemplateConfig.java          # HTTP 配置
├── src/main/resources/
│   ├── praise-mirror-pipeline.skill         # 技能配方（ZIP）
│   └── application-example.yml              # 配置模板
└── docs/
    ├── praise-mirror-api.md                 # API 文档
    └── INTEGRATION_SUMMARY.md               # 本文档
```

## 🚀 下一步（可选）

1. **预计算缓存**：实现 SKILL.md 中描述的 2.5s 轮询预热机制
2. **STT 集成**：添加语音输入支持（gpt-4o-mini-transcribe）
3. **并发控制**：添加限流和队列机制
4. **监控指标**：Prometheus/Grafana 集成
5. **A/B 测试**：不同 temperature 和提示词版本对比

## 💡 关键设计决策

1. **技能文件管理**：使用 ZIP 格式 .skill 文件，便于版本控制和分发
2. **提示词解析**：启动时一次性加载，避免重复解析
3. **并行执行**：P1 和 P_voice 无依赖关系，CompletableFuture 并行
4. **失败容错**：任何阶段失败都有兜底方案，保证用户体验
5. **调试友好**：暴露独立端点查看提示词和验证规则

## 📝 注意事项

- **API Key 安全**：生产环境务必用环境变量或密钥管理服务
- **图片大小**：建议限制 < 5MB，避免超时
- **并发限制**：阿里云 API 有 QPS 限制，需要做流控
- **成本控制**：视觉模型调用成本较高，考虑缓存策略
- **提示词更新**：修改 SKILL.md 后需重启应用（或实现热加载）
