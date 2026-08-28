# 后端构建和启动指南

## 已完成的修复

### 1. 包名错误修复
修复了 `shared/config` 目录下所有配置类的包名：
- `JacksonConfig.java`
- `SecurityConfig.java` 
- `OpenAIConfig.java`
- `CustomWebSocketConfig.java`
- `WebClientConfig.java`

从 `com.kuakua.mirror.config` 更正为 `com.kuakua.mirror.shared.config`

### 2. 导入依赖修复
- `LLMService.java` - 添加了 `SessionManager` 的正确导入
- `AudioWebSocketHandler.java` - 修正了 `OpenAIRealtimeService` 的导入路径
- `CustomWebSocketConfig.java` - 修复了 `AudioWebSocketHandler` 和 `WebSocketHandshakeInterceptor` 的导入

### 3. 缺失方法补充
- `SessionManager.SessionContext` - 添加了 `systemPrompt`、`currentAssistantMessage` 和 `getConversationHistory()` 方法
- `OpenAIService.java` - 添加了 `chatCompletionStream(List<Map<String, String>> messages)` 方法
- `AudioWebSocketHandler.java` - 添加了 `cleanupSession(String sessionId)` 方法

### 4. 配置文件更新
- `application.yml` - 添加了数据源配置，支持 H2 内存数据库
- `.env` - 创建了环境变量配置文件
- `pom.xml` - 将 H2 数据库依赖范围从 `test` 改为 `runtime`

### 5. 启用定时任务
- `MirrorApplication.java` - 添加了 `@EnableScheduling` 注解

## 构建方法

### 方案 1: 使用 Maven（推荐）

如果你有 Maven，可以直接运行：

```bash
# 安装 Maven (使用 Homebrew)
brew install maven

# 编译项目
cd /Users/yonjay/codes/hubs/kuakua-mirror/backend
mvn clean compile

# 运行项目
mvn spring-boot:run
```

### 方案 2: 修复 Maven Wrapper

```bash
cd /Users/yonjay/codes/hubs/kuakua-mirror/backend

# 手动下载 Maven Wrapper (需要网络访问)
# 或者从其他项目复制 .mvn/wrapper/maven-wrapper.jar

# 运行
./mvnw clean compile
./mvnw spring-boot:run
```

### 方案 3: 使用 Docker

```bash
cd /Users/yonjay/codes/hubs/kuakua-mirror/backend

# 构建镜像
docker build -t kuakua-mirror-backend .

# 运行容器
docker run -p 8080:8080 \
  -e OPENAI_API_KEY=your_api_key \
  -e DATABASE_URL=jdbc:h2:mem:kuakua_mirror \
  kuakua-mirror-backend
```

### 方案 4: 使用 IDE (IntelliJ IDEA / Eclipse)

1. 导入项目（Maven 项目）
2. IDE 会自动下载依赖
3. 运行 `MirrorApplication.main()`

## 环境变量配置

### 快速验证（使用 H2 内存数据库）

编辑 `.env` 文件：

```bash
# 使用 H2 内存数据库（无需外部数据库）
DATABASE_URL=jdbc:h2:mem:kuakua_mirror
DATABASE_USERNAME=sa
DATABASE_PASSWORD=
DATABASE_DRIVER=org.h2.Driver
HIBERNATE_DIALECT=org.hibernate.dialect.H2Dialect

# OpenAI API Key（必需）
OPENAI_API_KEY=sk-your-actual-api-key-here

# 其他配置使用默认值
JWT_SECRET=your_jwt_secret_here_change_in_production_at_least_32_characters_long
WEBSOCKET_ALLOWED_ORIGINS=*
PORT=8080
```

### 生产环境（使用 PostgreSQL/Supabase）

```bash
# PostgreSQL 配置
DATABASE_URL=jdbc:postgresql://db.xxxx.supabase.co:5432/postgres
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_supabase_password
DATABASE_DRIVER=org.postgresql.Driver
HIBERNATE_DIALECT=org.hibernate.dialect.PostgreSQLDialect

# OpenAI API Key
OPENAI_API_KEY=sk-your-actual-api-key-here

# 其他配置
JWT_SECRET=your_strong_jwt_secret_at_least_32_characters_long
WEBSOCKET_ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000
PORT=8080
```

## 验证服务启动

### 1. 检查健康接口

```bash
curl http://localhost:8080/api/health
```

期望返回：
```json
{
  "status": "UP",
  "timestamp": "2026-08-28T..."
}
```

### 2. 检查 WebSocket 端点

使用 WebSocket 客户端工具连接：
```
ws://localhost:8080/ws/device
```

发送测试消息：
```json
{
  "type": "device.hello",
  "payload": {
    "deviceId": "test_device_001",
    "firmwareVersion": "1.0.0",
    "protocolVersion": "1.0",
    "capabilities": ["audio", "display"]
  }
}
```

期望收到：
```json
{
  "type": "device.ready",
  "timestamp": 1724824800000,
  "payload": {
    "sessionId": "sess_xxxxx"
  }
}
```

### 3. 检查 H2 控制台（开发环境）

访问：http://localhost:8080/h2-console

- JDBC URL: `jdbc:h2:mem:kuakua_mirror`
- Username: `sa`
- Password: (留空)

## 常见问题

### 1. Maven wrapper 无法运行

**错误**: `找不到或无法加载主类 org.apache.maven.wrapper.MavenWrapperMain`

**解决方案**: 
- 安装系统 Maven: `brew install maven`
- 或使用 IDE 导入项目

### 2. 数据库连接失败

**错误**: `Connection refused` 或 `Unknown database`

**解决方案**:
- 使用 H2 内存数据库进行快速验证
- 检查 PostgreSQL 是否启动
- 验证 `DATABASE_URL` 配置正确

### 3. OpenAI API 调用失败

**错误**: `401 Unauthorized` 或 `Invalid API Key`

**解决方案**:
- 验证 `OPENAI_API_KEY` 是否正确设置
- 检查 API Key 是否有效且有余额
- 确认 API Key 有权限访问 Realtime API

### 4. 编译错误

**错误**: 找不到类或符号

**解决方案**:
- 清理并重新编译: `mvn clean compile`
- 更新依赖: `mvn dependency:resolve`
- 检查 JDK 版本是否为 21+

## 下一步工作

完成 Ticket 01 后，继续：

1. **Ticket 02**: 创建 Supabase 项目
   - 访问 https://supabase.com 创建项目
   - 获取数据库连接字符串
   - 更新 `.env` 中的 `DATABASE_URL`
   - 重启服务验证连接

2. **验证 API 端点**:
   - 测试设备 WebSocket 连接
   - 测试对话 API
   - 验证数据持久化

3. **部署到 Railway**:
   - 推送代码到 Git
   - 连接 Railway
   - 配置环境变量
   - 部署并验证

## 快速启动命令（一键启动）

创建一个启动脚本 `quick-start.sh`:

```bash
#!/bin/bash

# 设置环境变量
export DATABASE_URL=jdbc:h2:mem:kuakua_mirror
export DATABASE_USERNAME=sa
export DATABASE_PASSWORD=
export OPENAI_API_KEY=${OPENAI_API_KEY:-"请设置你的API_KEY"}
export JWT_SECRET=default_jwt_secret_for_development_only_32chars
export WEBSOCKET_ALLOWED_ORIGINS=*
export PORT=8080

# 检查 Maven
if command -v mvn &> /dev/null; then
    echo "使用系统 Maven..."
    mvn spring-boot:run
elif [ -f "./mvnw" ]; then
    echo "使用 Maven Wrapper..."
    ./mvnw spring-boot:run
else
    echo "错误: 未找到 Maven，请先安装 Maven"
    echo "运行: brew install maven"
    exit 1
fi
```

使用方法：
```bash
chmod +x quick-start.sh
OPENAI_API_KEY=sk-your-key ./quick-start.sh
```
