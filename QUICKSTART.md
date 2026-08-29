# 夸夸镜 MVP 快速启动指南

## 📋 前置要求

### 必须
- **Java 21+** - 后端运行环境
- **Node.js 18+** - 前端和移动端开发
- **Maven 3.9+** - Java 构建工具（或使用 Maven Wrapper）

### 可选
- **Docker** - 容器化部署
- **Expo Go APP** - 移动端测试（iOS/Android）

## 🚀 快速启动（3 步）

### 第 1 步：修复 Maven Wrapper

```bash
cd backend

# 方案 A：如果有系统 Maven
mvn wrapper:wrapper

# 方案 B：直接使用系统 Maven
brew install maven  # macOS

# 方案 C：使用 IntelliJ IDEA（推荐）
# 直接用 IDE 打开项目，会自动处理依赖
```

### 第 2 步：启动后端

```bash
cd backend

# 配置环境变量
cat > .env << 'EOF'
OPENAI_API_KEY=sk-your-openai-api-key-here
DATABASE_URL=jdbc:h2:mem:testdb
SPRING_PROFILES_ACTIVE=dev
EOF

# 编译并启动
./mvnw spring-boot:run
# 或使用系统 Maven: mvn spring-boot:run

# 验证启动成功
curl http://localhost:8080/api/health
# 应该返回: {"status":"UP"}
```

### 第 3 步：启动前端和移动端

**启动前端（Next.js）：**
```bash
cd web
npm install
npm run dev
# 访问 http://localhost:3000
```

**启动移动端（Expo）：**
```bash
cd mobile
npm install
npx expo start
# 使用 Expo Go 扫描二维码
```

## 🧪 测试硬件协议

```bash
cd tools
pip3 install -r requirements.txt
python3 test-device-client.py --host localhost --port 8080

# 应该看到设备连接成功和心跳响应
```

## 📱 完整验证流程

### 1. 验证后端 API

```bash
# 健康检查
curl http://localhost:8080/api/health

# 创建对话会话
curl -X POST http://localhost:8080/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"deviceId": null}'

# 记录返回的 sessionId，然后发送消息
curl -X POST http://localhost:8080/api/conversations/YOUR_SESSION_ID/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "你好"}'
```

### 2. 验证监控页面

1. 打开浏览器访问 http://localhost:3000/monitor
2. 启动硬件测试工具：`python3 tools/test-device-client.py`
3. 监控页面应该显示设备连接和消息

### 3. 验证移动端 APP

1. 在手机上安装 Expo Go
2. 扫描终端显示的二维码
3. APP 应该自动启动
4. 输入消息，应该收到 AI 回复

## ⚠️ 常见问题

### 问题 1：Maven Wrapper 失败

**错误**：`找不到或无法加载主类 org.apache.maven.wrapper.MavenWrapperMain`

**解决**：参考 `backend/FIX_MAVEN_WRAPPER.md`

### 问题 2：Java 版本不对

**错误**：`Unsupported class file major version 65`

**解决**：
```bash
# 检查版本
java -version

# 设置 Java 21
export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home
```

### 问题 3：OpenAI API Key 无效

**错误**：`401 Unauthorized`

**解决**：
1. 访问 https://platform.openai.com/api-keys
2. 创建新的 API Key
3. 更新 `backend/.env` 文件

### 问题 4：端口被占用

**错误**：`Port 8080 is already in use`

**解决**：
```bash
# 查找占用端口的进程
lsof -i :8080

# 杀掉进程
kill -9 <PID>
```

### 问题 5：前端连接后端失败

**错误**：`CORS error` 或 `Connection refused`

**解决**：
1. 确认后端已启动：`curl http://localhost:8080/api/health`
2. 检查前端配置：`web/lib/api.ts` 中的 API_URL
3. 移动端需要使用局域网 IP，不能用 localhost

## 📚 详细文档

- [部署指南](docs/DEPLOYMENT.md) - 云平台部署
- [测试文档](docs/TESTING.md) - 完整测试清单
- [硬件协议](docs/硬件协议文档.md) - WebSocket 协议规范
- [演示准备](docs/演示流程.md) - 投资人演示

## 🎯 下一步

开发环境运行成功后：

1. **部署到云端**：参考 `docs/DEPLOYMENT.md`
2. **硬件对接**：参考 `docs/硬件协议文档.md`
3. **演示准备**：参考 `docs/演示流程.md`

## 💡 快捷命令

```bash
# 后端
cd backend && ./mvnw spring-boot:run

# 前端
cd web && npm run dev

# 移动端
cd mobile && npx expo start

# 测试工具
cd tools && python3 test-device-client.py

# 查看日志
cd backend && tail -f logs/spring-boot-logger.log
```

---

**遇到问题？** 查看 `docs/TESTING.md` 的故障排查章节。
