# 夸夸镜后端服务 (NestJS)

基于 NestJS + WebSocket + OpenAI API 的智能镜子后端服务。

## 功能特性

- ✅ 设备管理（注册、状态同步）
- ✅ WebSocket 实时通信
- ✅ 语音识别（Whisper API）
- ✅ AI 对话（GPT-4）
- ✅ 语音合成（TTS）
- ✅ 会话管理
- ✅ 实时监控

## 技术栈

- **框架**: NestJS 10.x
- **数据库**: SQLite + TypeORM
- **WebSocket**: @nestjs/websockets + ws
- **AI 服务**: OpenAI API (GPT-4, Whisper, TTS)
- **语言**: TypeScript 5.x

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 OpenAI API Key：

```env
OPENAI_API_KEY=sk-...
```

### 3. 启动开发服务器

```bash
npm run start:dev
```

服务将在 `http://localhost:8080` 启动。

### 4. 验证服务

访问健康检查接口：

```bash
curl http://localhost:8080/health
```

## API 文档

### REST API

#### 健康检查
```
GET /health
```

#### 设备管理
```
POST /api/devices/register    # 注册设备
GET  /api/devices/:deviceId   # 获取设备信息
PATCH /api/devices/:deviceId  # 更新设备信息
GET  /api/devices             # 获取所有设备
```

#### 会话管理
```
POST /api/conversations                    # 创建会话
GET  /api/conversations/:sessionId/messages # 获取会话历史
GET  /api/conversations/moment/:momentId   # 获取时刻相关会话
```

### WebSocket 接口

#### 设备连接
```
ws://localhost:8080/device/ws
```

消息类型：
- `register` - 设备注册
- `heartbeat` - 心跳

#### 音频处理
```
ws://localhost:8080/audio/ws
```

消息类型：
- `audio_start` - 开始音频会话
- `audio_chunk` - 音频数据块
- `audio_end` - 结束音频会话

#### 监控
```
ws://localhost:8080/monitor/ws
```

消息类型：
- `subscribe` - 订阅事件

## 项目结构

```
src/
├── ai/                 # AI 服务模块
│   ├── ai.service.ts
│   └── ai.module.ts
├── audio/              # 音频处理模块
│   ├── audio.gateway.ts
│   └── audio.module.ts
├── conversation/       # 会话管理模块
│   ├── entities/
│   ├── dto/
│   ├── conversation.service.ts
│   ├── conversation.controller.ts
│   └── conversation.module.ts
├── device/            # 设备管理模块
│   ├── entities/
│   ├── dto/
│   ├── device.service.ts
│   ├── device.controller.ts
│   ├── device.gateway.ts
│   └── device.module.ts
├── monitor/           # 监控模块
│   ├── monitor.gateway.ts
│   └── monitor.module.ts
├── shared/            # 共享模块
│   └── controllers/
│       └── health.controller.ts
├── app.module.ts      # 根模块
└── main.ts           # 入口文件
```

## 开发命令

```bash
# 开发模式（热重载）
npm run start:dev

# 生产构建
npm run build

# 生产运行
npm run start:prod

# 代码格式化
npm run format

# 代码检查
npm run lint

# 运行测试
npm run test

# 测试覆盖率
npm run test:cov
```

## 数据库

项目使用 SQLite 数据库，数据文件位于 `data/kuakua-mirror.db`。

数据库会在首次启动时自动创建，表结构通过 TypeORM 自动同步。

### 实体模型

- **Device**: 设备信息
- **Message**: 会话消息

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| PORT | 服务端口 | 8080 |
| NODE_ENV | 运行环境 | development |
| DATABASE_PATH | 数据库路径 | data/kuakua-mirror.db |
| OPENAI_API_KEY | OpenAI API Key | - |
| OPENAI_MODEL | OpenAI 模型 | gpt-4 |
| CORS_ORIGIN | CORS 允许源 | * |

## 部署

### Docker 部署（推荐）

```bash
# 构建镜像
docker build -t kuakua-service .

# 运行容器
docker run -d \
  -p 8080:8080 \
  -e OPENAI_API_KEY=your-key \
  -v $(pwd)/data:/app/data \
  kuakua-service
```

### 传统部署

```bash
# 安装依赖
npm ci --production

# 构建
npm run build

# 使用 PM2 运行
pm2 start dist/main.js --name kuakua-service
```

## 故障排查

### 数据库连接失败
确保 `data` 目录存在且有写权限：
```bash
mkdir -p data
chmod 755 data
```

### WebSocket 连接失败
检查防火墙设置，确保端口 8080 开放。

### OpenAI API 错误
- 检查 API Key 是否正确
- 确认账户有足够余额
- 检查网络连接

## 许可证

MIT
