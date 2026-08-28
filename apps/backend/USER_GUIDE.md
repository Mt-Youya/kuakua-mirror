# 🚀 用户操作指南 - 完成 Ticket 01 & 02

**当前状态**: 所有编译错误已修复，等待你启动服务并验证

---

## 📋 准备工作已完成

✅ 修复了所有 Java 编译错误（10个文件）  
✅ 配置了 H2 内存数据库支持快速验证  
✅ 创建了环境变量配置文件 `.env`  
✅ 创建了快速启动脚本 `quick-start.sh`  
✅ 创建了完整的构建指南 `BUILD.md`  

---

## ⚡ 快速启动（3步完成）

### 步骤 1: 安装 Maven

打开终端，运行：

```bash
# 如果 Homebrew 权限有问题，先修复权限
sudo chown -R $(whoami) /opt/homebrew /Users/$(whoami)/Library/Caches/Homebrew

# 安装 Maven
brew install maven

# 验证安装
mvn -version
```

预期输出类似：
```
Apache Maven 3.9.x
Maven home: /opt/homebrew/Cellar/maven/...
Java version: 25.0.4
```

### 步骤 2: 设置 OpenAI API Key

```bash
# 方式 1: 在命令行设置（临时）
export OPENAI_API_KEY=sk-your-actual-api-key-here

# 方式 2: 编辑 .env 文件（永久）
cd /Users/yonjay/codes/hubs/kuakua-mirror/backend
nano .env
# 修改这行: OPENAI_API_KEY=sk-your-actual-api-key-here
# 保存: Ctrl+O, 回车, Ctrl+X
```

### 步骤 3: 启动服务

```bash
cd /Users/yonjay/codes/hubs/kuakua-mirror/backend

# 使用快速启动脚本
OPENAI_API_KEY=sk-your-key ./quick-start.sh

# 或者手动启动
mvn spring-boot:run
```

---

## ✅ 验证服务启动

### 1. 查看启动日志

看到类似输出表示启动成功：

```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v3.2.0)

2026-08-28 ... INFO ... Started MirrorApplication in 3.456 seconds
```

### 2. 测试健康检查接口

打开新终端窗口：

```bash
curl http://localhost:8080/api/health
```

✅ **成功响应**:
```json
{
  "status": "UP",
  "timestamp": "2026-08-28T..."
}
```

### 3. 访问 H2 数据库控制台

浏览器打开: http://localhost:8080/h2-console

**连接信息**:
- JDBC URL: `jdbc:h2:mem:kuakua_mirror`
- Username: `sa`
- Password: (留空)

点击 "Connect"，然后运行：

```sql
SHOW TABLES;
```

你应该看到类似：
```
DEVICES
CONVERSATION_SESSIONS
MESSAGES
USERS
...
```

### 4. 测试 WebSocket 端点

安装并使用 wscat 工具：

```bash
# 安装 wscat
npm install -g wscat

# 连接到设备 WebSocket
wscat -c ws://localhost:8080/ws/device

# 发送设备握手消息
{"type":"device.hello","payload":{"deviceId":"mirror_001","firmwareVersion":"1.0.0","protocolVersion":"1.0","capabilities":["audio","display"]}}
```

✅ **成功响应**:
```json
{"type":"device.ready","timestamp":1724824800000,"payload":{"sessionId":"sess_1724824800000"}}
```

---

## 🎯 完成 Ticket 02 - Supabase 配置

### 步骤 1: 创建 Supabase 项目

1. 访问 https://supabase.com
2. 点击 "New project"
3. 填写信息：
   - **Organization**: 选择或创建组织
   - **Name**: `kuakua-mirror`
   - **Database Password**: 设置强密码（务必记住！）
   - **Region**: 选择 `Southeast Asia (Singapore)` 或 `Northeast Asia (Tokyo)`
   - **Pricing Plan**: 选择 `Free`

4. 点击 "Create new project"，等待 2-3 分钟初始化

### 步骤 2: 获取数据库连接字符串

项目创建完成后：

1. 进入项目 Dashboard
2. 点击左侧菜单 "Settings" → "Database"
3. 滚动到 "Connection string" 部分
4. 选择 "URI" 模式
5. 复制连接字符串，类似：
   ```
   postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```

### 步骤 3: 配置后端连接

编辑 `/Users/yonjay/codes/hubs/kuakua-mirror/backend/.env`:

```bash
# 注释掉 H2 配置
# DATABASE_URL=jdbc:h2:mem:kuakua_mirror
# DATABASE_USERNAME=sa
# DATABASE_PASSWORD=

# 添加 PostgreSQL 配置
DATABASE_URL=jdbc:postgresql://aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?user=postgres.abcdefghijklmnop&password=YOUR-PASSWORD
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=YOUR-PASSWORD
DATABASE_DRIVER=org.postgresql.Driver
HIBERNATE_DIALECT=org.hibernate.dialect.PostgreSQLDialect
```

⚠️ **注意**: 
- 将连接字符串中的 `postgresql://` 改为 `jdbc:postgresql://`
- 将 `[YOUR-PASSWORD]` 替换为你的实际密码

### 步骤 4: 重启服务验证

```bash
# 停止当前服务 (Ctrl+C)

# 重新启动
cd /Users/yonjay/codes/hubs/kuakua-mirror/backend
mvn spring-boot:run
```

查看日志，应该看到：
```
Hibernate: create table devices ...
Hibernate: create table conversation_sessions ...
```

### 步骤 5: 验证 Supabase 中的表

回到 Supabase Dashboard:

1. 点击左侧 "Table Editor"
2. 你应该看到新创建的表：
   - `devices`
   - `conversation_sessions`
   - `messages`
   - `users`
   - `moments`
   - 等等

---

## 🐛 常见问题

### Q1: Maven 下载依赖很慢？

**方案**: 配置国内镜像

编辑 `~/.m2/settings.xml` (如果不存在就创建)：

```xml
<settings>
  <mirrors>
    <mirror>
      <id>aliyun</id>
      <mirrorOf>central</mirrorOf>
      <name>Aliyun Maven</name>
      <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
  </mirrors>
</settings>
```

### Q2: 启动时报错 "Port 8080 already in use"？

**解决方案**:

```bash
# 查找占用端口的进程
lsof -i :8080

# 杀死进程
kill -9 <PID>

# 或者修改端口
export PORT=8081
mvn spring-boot:run
```

### Q3: OpenAI API 调用失败？

**检查清单**:
- ✅ API Key 是否正确设置
- ✅ API Key 是否有余额
- ✅ API Key 是否有权限访问 Realtime API
- ✅ 网络是否能访问 api.openai.com

测试 API Key：
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Q4: 连接 Supabase 失败？

**检查清单**:
- ✅ 连接字符串是否正确（注意 `jdbc:` 前缀）
- ✅ 密码是否正确
- ✅ 网络是否能访问 Supabase 域名
- ✅ Supabase 项目是否处于 Active 状态

测试连接：
```bash
psql "postgresql://postgres.xxx:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

---

## 📊 完成检查清单

请完成以下步骤并打勾：

### Ticket 01: 后端启动
- [ ] Maven 已安装 (`mvn -version` 输出正常)
- [ ] OpenAI API Key 已设置
- [ ] 服务成功启动（看到 Spring Boot 启动日志）
- [ ] 健康检查接口返回 200 (`/api/health`)
- [ ] WebSocket 端点可连接 (`/ws/device`)
- [ ] H2 控制台可访问并看到表结构

### Ticket 02: Supabase 配置
- [ ] Supabase 项目已创建
- [ ] 数据库连接字符串已获取
- [ ] `.env` 文件已更新为 PostgreSQL 配置
- [ ] 服务重启成功连接到 Supabase
- [ ] Supabase Table Editor 中看到自动创建的表

---

## 🎉 完成后的下一步

恭喜！如果所有检查项都完成，你可以继续：

1. **部署到 Railway** (明天)
   - 推送代码到 GitHub
   - 连接 Railway 项目
   - 配置环境变量
   - 部署并获取公网 URL

2. **开发前端** (明天)
   - 创建 Next.js 项目
   - 实现监控页面
   - 对接后端 API

3. **开发 APP** (明天)
   - 创建 Expo 项目
   - 实现对话界面
   - 对接后端 API

4. **硬件对接** (明天晚上)
   - 更新固件协议
   - 联调测试
   - 完整演示流程

---

## 📞 需要帮助？

如果遇到问题：

1. 查看 `BUILD.md` 获取详细的构建指南
2. 查看 `TICKET_01_02_REPORT.md` 获取完整的实施报告
3. 查看服务启动日志中的错误信息
4. 检查 `.env` 文件配置是否正确

---

**祝顺利！💪**

*最后更新: 2026-08-28*
