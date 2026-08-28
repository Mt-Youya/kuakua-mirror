# KuaKua Mirror

夸夸镜 - 实时 AI 语音对话系统

## 项目简介

KuaKua Mirror 是一个基于 Spring Boot WebFlux 和 WebSocket 的实时语音对话系统，集成 OpenAI 的 ASR（语音识别）、LLM（大语言模型）和 TTS（语音合成）能力，提供流畅的实时语音交互体验。

## 技术架构

### 后端技术栈

- **框架**: Spring Boot 3.2.0 + WebFlux
- **编程语言**: Java 21
- **响应式编程**: Project Reactor
- **通信协议**: WebSocket
- **AI 服务**: OpenAI API (Whisper ASR + GPT-4o Realtime + TTS)
- **构建工具**: Maven
- **容器化**: Docker + Docker Compose

### 核心特性

✅ 实时双向语音通信  
✅ 响应式非阻塞架构  
✅ WebSocket 全双工通信  
✅ 会话状态管理  
✅ 音频流式处理  
✅ 完整的异常处理机制  
✅ 健康检查与监控  
✅ Docker 容器化部署  

## 项目结构

```
kuakua-mirror/
├── backend/                    # Spring Boot 后端服务
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/kuakua/mirror/
│   │   │   │   ├── MirrorApplication.java       # 应用入口
│   │   │   │   ├── config/                      # 配置类
│   │   │   │   ├── controller/                  # REST 控制器
│   │   │   │   ├── handler/                     # WebSocket 处理器
│   │   │   │   ├── service/                     # 业务服务
│   │   │   │   ├── model/                       # 数据模型
│   │   │   │   ├── exception/                   # 异常处理
│   │   │   │   └── util/                        # 工具类
│   │   │   └── resources/
│   │   │       └── application.yml              # 应用配置
│   │   └── test/                                # 单元测试
│   ├── Dockerfile                               # Docker 镜像构建
│   ├── docker-compose.yml                       # Docker Compose 配置
│   ├── start.sh                                 # 启动脚本
│   ├── pom.xml                                  # Maven 依赖配置
│   └── README.md                                # 后端文档
├── docs/                                        # 文档目录
└── README.md                                    # 项目总文档
```

## 快速开始

### 前置要求

- JDK 21+
- Maven 3.6+
- Docker & Docker Compose（可选）
- OpenAI API Key

### 环境配置

1. 设置 OpenAI API Key：

```bash
export OPENAI_API_KEY=your_openai_api_key
```

2. （可选）设置 API Base URL：

```bash
export OPENAI_API_BASE=https://api.openai.com
```

### 本地运行

#### 方式一：使用启动脚本

```bash
cd backend
./start.sh
```

#### 方式二：使用 Maven

```bash
cd backend
./mvnw spring-boot:run
```

#### 方式三：使用 Docker Compose

```bash
cd backend
docker-compose up -d
```

服务启动后访问：
- **API 基础路径**: http://localhost:8080/api
- **健康检查**: http://localhost:8080/api/health
- **版本信息**: http://localhost:8080/api/version
- **WebSocket**: ws://localhost:8080/v1/realtime

## API 文档

### REST 端点

#### 健康检查

```bash
GET /api/health
```

响应示例：
```json
{
  "status": "UP",
  "timestamp": "2026-08-28T10:30:00",
  "service": "kuakua-mirror"
}
```

#### 版本信息

```bash
GET /api/version
```

响应示例：
```json
{
  "version": "1.0.0",
  "name": "KuaKua Mirror Backend"
}
```

### WebSocket 端点

连接地址：`ws://localhost:8080/v1/realtime`

#### 消息类型

**客户端 → 服务端**：
- `audio.input` - 音频输入
- `audio.input_complete` - 音频输入完成
- `conversation.item.create` - 创建对话项
- `response.create` - 创建响应
- `response.cancel` - 取消响应
- `session.update` - 更新会话配置

**服务端 → 客户端**：
- `conversation.item.input_audio_transcription.completed` - 转录完成
- `response.audio.start` - 响应开始
- `response.audio.delta` - 音频数据块
- `response.audio.done` - 响应完成
- `error` - 错误信息

详细消息格式请参考 [backend/README.md](backend/README.md)

## 音频格式

- **格式**: PCM16
- **采样率**: 24000 Hz
- **声道**: 单声道（Mono）
- **编码**: Base64

## 开发指南

### 运行测试

```bash
cd backend
./mvnw test
```

### 构建项目

```bash
cd backend
./mvnw clean package
```

### Docker 构建

```bash
cd backend
docker build -t kuakua-mirror-backend .
```

### 代码规范

- 遵循 Java 代码规范
- 使用 Lombok 减少样板代码
- 响应式编程使用 Reactor（Mono/Flux）
- 所有服务方法返回响应式类型
- 异常统一通过 GlobalExceptionHandler 处理

## 部署

### Docker 部署

```bash
cd backend
docker-compose up -d
```

查看日志：
```bash
docker-compose logs -f
```

停止服务：
```bash
docker-compose down
```

## 故障排查

### 常见问题

1. **Java 版本错误**
   - 确保安装 JDK 21 或更高版本
   - 运行 `java -version` 检查版本

2. **OpenAI API Key 未设置**
   - 检查环境变量 `OPENAI_API_KEY` 是否设置
   - 或在 `application.yml` 中配置

3. **端口被占用**
   - 修改 `application.yml` 中的 `server.port`
   - 或使用环境变量 `SERVER_PORT`

4. **WebSocket 连接失败**
   - 检查防火墙设置
   - 确认服务已启动且健康检查通过
   - 验证 WebSocket 路径正确

## 路线图

- [ ] 前端 Web 界面
- [ ] 移动端应用
- [ ] 多语言支持
- [ ] 自定义语音角色
- [ ] 对话历史持久化
- [ ] 用户认证与授权
- [ ] 性能监控与指标
- [ ] 分布式部署支持

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue。

---

**Built with ❤️ using Spring Boot & OpenAI**
