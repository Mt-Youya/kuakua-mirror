# 部署指南

KuaKua Mirror 全栈应用部署完整指南

## 目录

- [快速开始](#快速开始)
- [环境准备](#环境准备)
- [数据库部署 (Supabase)](#数据库部署-supabase)
- [后端部署 (Railway)](#后端部署-railway)
- [前端部署 (Vercel)](#前端部署-vercel)
- [本地开发部署](#本地开发部署)
- [Docker 部署](#docker-部署)
- [配置说明](#配置说明)
- [监控与日志](#监控与日志)
- [故障排查](#故障排查)

---

## 快速开始

推荐的生产环境部署方案：

1. **数据库**: Supabase（PostgreSQL 托管服务）
2. **后端**: Railway（Java Spring Boot）
3. **前端**: Vercel（Next.js）

预计部署时间：15-20 分钟

---

## 数据库部署 (Supabase)

### 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com) 并登录
2. 点击 **New Project**
3. 填写项目信息：
   - **Name**: `kuakua-mirror`
   - **Database Password**: 生成强密码（务必保存）
   - **Region**: 选择离用户最近的区域（如 `Northeast Asia (Tokyo)`）
4. 点击 **Create new project**，等待 2-3 分钟初始化完成

### 2. 获取数据库连接信息

1. 进入项目后，点击左侧 **Settings** → **Database**
2. 在 **Connection string** 部分找到：
   - **URI** (用于 Spring Boot)
   - **Connection pooling** (推荐用于生产环境)

示例连接字符串：

```
# 直接连接 (Direct connection)
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# 连接池 (Connection pooling) - 推荐
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

### 3. 配置数据库

Supabase 默认已配置好 PostgreSQL，无需额外设置。如需运行数据库迁移：

```bash
cd backend

# 方式一：通过 Maven 插件运行 Flyway
./mvnw flyway:migrate -Dflyway.url="jdbc:postgresql://..." \
  -Dflyway.user=postgres \
  -Dflyway.password=YOUR_PASSWORD

# 方式二：在 Supabase SQL Editor 中手动执行
# 访问 Dashboard → SQL Editor，粘贴并执行 src/main/resources/db/migration 目录下的 SQL 文件
```

### 4. 环境变量准备

保存以下信息，稍后配置后端时使用：

```env
DATABASE_URL=jdbc:postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=[YOUR-PASSWORD]
```

---

## 后端部署 (Railway)

### 1. 准备工作

确保本地项目可以正常编译：

```bash
cd backend
./mvnw clean package -DskipTests
```

### 2. 创建 Railway 项目

1. 访问 [Railway](https://railway.app) 并使用 GitHub 登录
2. 点击 **New Project**
3. 选择 **Deploy from GitHub repo**
4. 授权并选择 `kuakua-mirror` 仓库
5. Railway 会自动检测到 Maven 项目

### 3. 配置构建设置

在 Railway 项目中：

1. 点击部署的服务
2. 进入 **Settings** 标签
3. 配置以下内容：

**Root Directory**:

```
backend
```

**Build Command** (可选，Railway 通常自动检测):

```bash
./mvnw clean package -DskipTests
```

**Start Command**:

```bash
java -Dserver.port=$PORT -jar target/mirror-backend-1.0.0.jar
```

**Watch Paths** (监控变更路径):

```
backend/**
```

### 4. 配置环境变量

在 **Variables** 标签中添加：

```env
# 数据库配置 (从 Supabase 复制)
DATABASE_URL=jdbc:postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=[YOUR-PASSWORD]

# OpenAI API
OPENAI_API_KEY=sk-proj-...

# JWT 配置
JWT_SECRET=your_jwt_secret_at_least_32_characters_long_random_string
JWT_EXPIRATION=604800000

# WebSocket 配置
WEBSOCKET_ALLOWED_ORIGINS=https://your-web-domain.vercel.app,http://localhost:3000

# 管理员密码
ADMIN_PASSWORD=your_secure_admin_password

# Spring Profile
SPRING_PROFILES_ACTIVE=prod

# 端口 (Railway 自动提供)
PORT=8080
```

**重要提示**：

- `WEBSOCKET_ALLOWED_ORIGINS` 需要包含前端域名
- `JWT_SECRET` 必须至少 32 字符，使用随机字符串
- 生产环境务必修改 `ADMIN_PASSWORD`

### 5. 部署

1. 点击 **Deploy** 按钮
2. 查看构建日志，等待部署完成（约 3-5 分钟）
3. 部署成功后，Railway 会提供一个公共 URL

### 6. 获取后端 URL

1. 在 **Settings** → **Networking** 中
2. 点击 **Generate Domain** 生成公共访问域名
3. 保存域名，例如：`https://kuakua-mirror-backend.up.railway.app`

### 7. 验证部署

```bash
# 健康检查
curl https://your-backend-url.railway.app/api/health

# 预期响应
{
  "status": "UP",
  "timestamp": "2026-08-28T...",
  "service": "kuakua-mirror"
}
```

---

## 前端部署 (Vercel)

### 1. 准备前端配置

创建前端环境变量文件（本地测试用）：

```bash
cd web
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_WS_URL=wss://your-backend-url.railway.app
EOF
```

### 2. 创建 Vercel 项目

**方式一：通过 Vercel Dashboard**

1. 访问 [Vercel](https://vercel.com) 并使用 GitHub 登录
2. 点击 **Add New...** → **Project**
3. 导入 `kuakua-mirror` 仓库
4. 配置项目：
   - **Framework Preset**: Next.js
   - **Root Directory**: `web`
   - **Build Command**: `pnpm build`（或 `npm run build`）
   - **Output Directory**: `.next`（默认）
   - **Install Command**: `pnpm install`（或 `npm install`）

**方式二：通过 Vercel CLI**

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署（在 web 目录下）
cd web
vercel

# 按提示配置项目
# - Set up and deploy: Yes
# - Which scope: 选择你的账号
# - Link to existing project: No
# - Project name: kuakua-mirror-web
# - In which directory: ./
# - Want to override settings: No
```

### 3. 配置环境变量

在 Vercel Dashboard 中：

1. 进入项目 → **Settings** → **Environment Variables**
2. 添加以下变量：

```env
# 后端 API 地址 (从 Railway 复制)
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app

# WebSocket 地址
NEXT_PUBLIC_WS_URL=wss://your-backend-url.railway.app

# 其他前端配置（根据需要添加）
NEXT_PUBLIC_APP_NAME=夸夸镜
```

3. 选择环境：**Production**, **Preview**, **Development**（全选）
4. 点击 **Save**

### 4. 触发重新部署

1. 配置环境变量后，点击 **Deployments**
2. 选择最新部署，点击 **...** → **Redeploy**
3. 勾选 **Use existing Build Cache**
4. 点击 **Redeploy**

### 5. 配置自定义域名（可选）

1. 在 **Settings** → **Domains**
2. 添加自定义域名（如 `app.kuakua-mirror.com`）
3. 按提示配置 DNS 记录
4. Vercel 会自动提供 SSL 证书

### 6. 更新后端 CORS 配置

回到 Railway，更新后端环境变量：

```env
WEBSOCKET_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://app.kuakua-mirror.com,http://localhost:3000
```

### 7. 验证部署

1. 访问 Vercel 提供的 URL（如 `https://kuakua-mirror-web.vercel.app`）
2. 检查浏览器控制台，确认无 CORS 错误
3. 测试后端 API 连接

---

## 环境准备

### 云服务账号

部署前需要注册以下服务（均提供免费套餐）：

1. **Supabase**: https://supabase.com（数据库）
2. **Railway**: https://railway.app（后端托管）
3. **Vercel**: https://vercel.com（前端托管）
4. **OpenAI**: https://platform.openai.com（AI API）

### 本地开发环境

#### 系统要求

- **操作系统**: Linux (Ubuntu 20.04+) / macOS / Windows
- **CPU**: 2 核心以上
- **内存**: 4GB 以上
- **磁盘**: 10GB 可用空间

#### 必需软件

- **JDK**: OpenJDK 21 或 Oracle JDK 21+
- **Node.js**: 18.x 或 20.x+
- **pnpm**: 8.x+（推荐）或 npm
- **Maven**: 3.6.3+（或使用项目自带的 Maven Wrapper）

#### 可选软件

- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: 版本控制

### 安装开发工具

**Ubuntu/Debian**:

```bash
# 安装 JDK 21
sudo apt update
sudo apt install openjdk-21-jdk -y

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y

# 安装 pnpm
npm install -g pnpm

# 验证安装
java -version
node -v
pnpm -v
```

**macOS** (使用 Homebrew):

```bash
# 安装 JDK 21
brew install openjdk@21

# 安装 Node.js
brew install node@20

# 安装 pnpm
npm install -g pnpm

# 验证安装
java -version
node -v
pnpm -v
```

**Windows**:

1. 下载并安装 [JDK 21](https://adoptium.net/)
2. 下载并安装 [Node.js 20](https://nodejs.org/)
3. 安装 pnpm: `npm install -g pnpm`
4. 配置环境变量（参考下一节）

### 配置环境变量

**Linux/macOS**:

```bash
# 编辑 ~/.bashrc 或 ~/.zshrc
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64  # 根据实际路径调整
export PATH=$JAVA_HOME/bin:$PATH

# 重新加载配置
source ~/.bashrc  # 或 source ~/.zshrc
```

**Windows**:

1. 右键"此电脑" → 属性 → 高级系统设置
2. 环境变量 → 新建系统变量 `JAVA_HOME`
3. 值为 JDK 安装路径，如 `C:\Program Files\Java\jdk-21`
4. 编辑 `Path` 变量，添加 `%JAVA_HOME%\bin`

---

## 本地开发部署

### 方式一：使用启动脚本

```bash
cd backend

# 设置 OpenAI API Key
export OPENAI_API_KEY=your_api_key_here

# 运行启动脚本
./start.sh
```

启动脚本会自动：

1. 检查 Java 版本
2. 检查环境变量
3. 编译项目
4. 启动应用

### 方式二：使用 Maven

```bash
cd backend

# 设置环境变量
export OPENAI_API_KEY=your_api_key_here
export OPENAI_API_BASE=https://api.openai.com  # 可选

# 编译项目
./mvnw clean compile

# 运行应用
./mvnw spring-boot:run
```

### 方式三：打包后运行

```bash
cd backend

# 打包（跳过测试）
./mvnw clean package -DskipTests

# 运行 JAR 文件
java -jar target/mirror-1.0.0.jar
```

### 验证部署

访问以下端点验证服务是否正常：

```bash
# 健康检查
curl http://localhost:8080/api/health

# 版本信息
curl http://localhost:8080/api/version
```

预期响应：

```json
{
  "status": "UP",
  "timestamp": "2026-08-28T10:30:00",
  "service": "kuakua-mirror"
}
```

---

## Docker 部署

### 前置准备

确保已安装 Docker 和 Docker Compose：

```bash
docker --version
docker-compose --version
```

### 构建镜像

```bash
cd backend

# 构建 Docker 镜像
docker build -t kuakua-mirror-backend:1.0.0 .
```

### 使用 Docker Compose

#### 1. 配置环境变量

创建 `.env` 文件：

```bash
cd backend
cat > .env << EOF
OPENAI_API_KEY=your_api_key_here
OPENAI_API_BASE=https://api.openai.com
SPRING_PROFILES_ACTIVE=prod
EOF
```

#### 2. 启动服务

```bash
docker-compose up -d
```

#### 3. 查看日志

```bash
# 实时日志
docker-compose logs -f

# 查看最近 100 行日志
docker-compose logs --tail=100
```

#### 4. 停止服务

```bash
docker-compose down
```

#### 5. 重启服务

```bash
docker-compose restart
```

### 手动 Docker 运行

如果不使用 Docker Compose：

```bash
# 创建网络
docker network create kuakua-network

# 运行容器
docker run -d \
  --name kuakua-mirror-backend \
  --network kuakua-network \
  -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e OPENAI_API_KEY=your_api_key_here \
  -v $(pwd)/logs:/app/logs \
  --restart unless-stopped \
  kuakua-mirror-backend:1.0.0

# 查看日志
docker logs -f kuakua-mirror-backend
```

---

## 生产环境部署

### 1. 服务器准备

#### 1.1 更新系统

```bash
sudo apt update && sudo apt upgrade -y
```

#### 1.2 安装必要软件

```bash
# 安装 JDK 21
sudo apt install openjdk-21-jdk -y

# 安装 Docker（可选）
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### 1.3 配置防火墙

```bash
# 允许 8080 端口
sudo ufw allow 8080/tcp
sudo ufw enable
```

### 2. 应用部署

#### 2.1 上传代码

```bash
# 在本地打包
cd backend
./mvnw clean package -DskipTests

# 上传到服务器
scp target/mirror-1.0.0.jar user@server:/opt/kuakua-mirror/
```

#### 2.2 创建 systemd 服务

创建服务文件 `/etc/systemd/system/kuakua-mirror.service`：

```ini
[Unit]
Description=KuaKua Mirror Backend Service
After=network.target

[Service]
Type=simple
User=kuakua
Group=kuakua
WorkingDirectory=/opt/kuakua-mirror
Environment="JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64"
Environment="OPENAI_API_KEY=your_api_key_here"
Environment="SPRING_PROFILES_ACTIVE=prod"
ExecStart=/usr/bin/java -Xms512m -Xmx2g -jar /opt/kuakua-mirror/mirror-1.0.0.jar
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

#### 2.3 创建专用用户

```bash
sudo useradd -r -s /bin/false kuakua
sudo mkdir -p /opt/kuakua-mirror/logs
sudo chown -R kuakua:kuakua /opt/kuakua-mirror
```

#### 2.4 启动服务

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start kuakua-mirror

# 设置开机自启
sudo systemctl enable kuakua-mirror

# 查看状态
sudo systemctl status kuakua-mirror

# 查看日志
sudo journalctl -u kuakua-mirror -f
```

### 3. Nginx 反向代理（推荐）

#### 3.1 安装 Nginx

```bash
sudo apt install nginx -y
```

#### 3.2 配置 Nginx

创建配置文件 `/etc/nginx/sites-available/kuakua-mirror`：

```nginx
upstream kuakua_backend {
    server 127.0.0.1:8080;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com;

    # WebSocket 支持
    location /v1/realtime {
        proxy_pass http://kuakua_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # REST API
    location /api/ {
        proxy_pass http://kuakua_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 健康检查（内部使用）
    location = /health {
        proxy_pass http://kuakua_backend/api/health;
        access_log off;
    }
}
```

#### 3.3 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/kuakua-mirror /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

#### 3.4 配置 SSL（推荐）

使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 4. 生产环境配置

创建 `application-prod.yml`：

```yaml
server:
  port: 8080
  shutdown: graceful

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s

logging:
  level:
    root: WARN
    com.kuakua.mirror: INFO
  file:
    name: /opt/kuakua-mirror/logs/application.log
  logback:
    rollingpolicy:
      max-file-size: 100MB
      max-history: 30
      total-size-cap: 3GB

openai:
  api:
    key: ${OPENAI_API_KEY}
    base-url: ${OPENAI_API_BASE:https://api.openai.com}
    timeout: 60000
    max-retries: 3
```

---

## 配置说明

### 环境变量完整列表

#### 后端环境变量 (Railway/生产环境)

| 变量名                      | 说明                           | 示例值                      | 必需 |
| --------------------------- | ------------------------------ | --------------------------- | ---- |
| `DATABASE_URL`              | 数据库 JDBC 连接字符串         | `jdbc:postgresql://...`     | 是   |
| `DATABASE_USERNAME`         | 数据库用户名                   | `postgres`                  | 是   |
| `DATABASE_PASSWORD`         | 数据库密码                     | `your_password`             | 是   |
| `OPENAI_API_KEY`            | OpenAI API 密钥                | `sk-proj-...`               | 是   |
| `JWT_SECRET`                | JWT 签名密钥（至少 32 字符）   | `random_string_32_chars...` | 是   |
| `JWT_EXPIRATION`            | JWT 过期时间（毫秒）           | `604800000`（7天）          | 否   |
| `WEBSOCKET_ALLOWED_ORIGINS` | WebSocket 允许的源（逗号分隔） | `https://app.vercel.app`    | 是   |
| `ADMIN_PASSWORD`            | 管理员密码                     | `secure_password`           | 是   |
| `PORT`                      | 服务端口                       | `8080`                      | 否   |
| `SPRING_PROFILES_ACTIVE`    | Spring 配置文件                | `prod`                      | 否   |

#### 前端环境变量 (Vercel)

| 变量名                 | 说明               | 示例值                        | 必需 |
| ---------------------- | ------------------ | ----------------------------- | ---- |
| `NEXT_PUBLIC_API_URL`  | 后端 API 基础 URL  | `https://backend.railway.app` | 是   |
| `NEXT_PUBLIC_WS_URL`   | WebSocket 服务 URL | `wss://backend.railway.app`   | 是   |
| `NEXT_PUBLIC_APP_NAME` | 应用名称           | `夸夸镜`                      | 否   |

### 生成安全的 JWT Secret

```bash
# Linux/macOS
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Supabase 数据库配置详解

#### 连接方式选择

**直接连接** (Direct connection):

- 适用场景：本地开发、小规模应用
- 连接数限制：较少（默认 100）
- 格式：`postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`

**连接池** (Connection pooling) - **推荐生产环境使用**:

- 适用场景：生产环境、高并发应用
- 连接数限制：较多（默认 1000+）
- 格式：`postgresql://postgres.[REF]:[PASSWORD]@[REGION].pooler.supabase.com:6543/postgres`
- 优势：更好的连接管理、更高的并发性能

#### Spring Boot 数据库配置

在 `application.yml` 或 `application-prod.yml` 中：

```yaml
spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
  jpa:
    hibernate:
      ddl-auto: validate # 生产环境使用 validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
    show-sql: false
```

#### Railway 环境变量格式

Railway 需要分别设置三个变量：

```env
DATABASE_URL=jdbc:postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password_here
```

**注意**：

- `DATABASE_URL` 必须以 `jdbc:postgresql://` 开头（JDBC 格式）
- Supabase 提供的是 `postgresql://` 格式，需要手动添加 `jdbc:` 前缀

### CORS 和 WebSocket 配置

#### 配置允许的源

Railway 后端环境变量：

```env
# 开发环境
WEBSOCKET_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# 生产环境
WEBSOCKET_ALLOWED_ORIGINS=https://your-app.vercel.app,https://custom-domain.com

# 混合环境（开发+生产）
WEBSOCKET_ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

#### 后端 CORS 配置代码

如果需要自定义 CORS 配置，编辑 `src/main/java/com/kuakua/mirror/config/WebConfig.java`：

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${websocket.allowed-origins:*}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.split(","))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
```

### JVM 参数优化

生产环境推荐的 JVM 参数：

#### Railway 部署

Railway 会自动设置 `-Dserver.port=$PORT`，其他参数可通过修改 Start Command 添加：

```bash
java -Xms512m -Xmx1g -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -Dserver.port=$PORT -jar target/mirror-backend-1.0.0.jar
```

#### 本地/VPS 部署

```bash
JAVA_OPTS="-Xms512m \
  -Xmx2g \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -Djava.security.egd=file:/dev/./urandom \
  -Dfile.encoding=UTF-8"
```

**参数说明**：

- `-Xms512m`: 初始堆内存 512MB
- `-Xmx1g`: 最大堆内存 1GB（Railway 免费套餐建议不超过 1GB）
- `-XX:+UseG1GC`: 使用 G1 垃圾收集器（适合大堆内存）
- `-XX:MaxGCPauseMillis=200`: 目标 GC 暂停时间 200ms

### Spring Profiles

项目支持多个配置文件：

#### dev (开发环境)

- 详细日志输出
- 使用 H2 内存数据库（无需外部数据库）
- 开启热重载
- 允许所有 CORS 源

激活方式：

```bash
export SPRING_PROFILES_ACTIVE=dev
./mvnw spring-boot:run
```

#### prod (生产环境)

- 简洁日志输出（WARN 级别）
- 使用 PostgreSQL 数据库
- 优化性能配置
- 严格的 CORS 限制

激活方式：

```bash
export SPRING_PROFILES_ACTIVE=prod
java -jar target/mirror-backend-1.0.0.jar
```

#### test (测试环境)

- 用于单元测试和集成测试
- 使用 H2 内存数据库
- 自动在测试结束后清理数据

### 数据库迁移 (Flyway)

项目使用 Flyway 进行数据库版本管理。

#### 迁移文件位置

```
backend/src/main/resources/db/migration/
├── V1__initial_schema.sql
├── V2__add_user_fields.sql
└── V3__create_conversation_table.sql
```

#### 手动执行迁移

```bash
cd backend

# 查看迁移状态
./mvnw flyway:info

# 执行迁移
./mvnw flyway:migrate

# 回滚最后一次迁移（需要 Flyway Teams）
./mvnw flyway:undo

# 清空数据库（慎用！）
./mvnw flyway:clean
```

#### 在 Supabase 中手动执行

1. 访问 Supabase Dashboard → SQL Editor
2. 打开 `src/main/resources/db/migration/V1__initial_schema.sql`
3. 复制 SQL 内容并执行
4. 重复以上步骤执行其他迁移文件

### 环境变量最佳实践

1. **本地开发**: 使用 `.env` 文件（已在 `.gitignore` 中）

   ```bash
   cd backend
   cp .env.example .env
   # 编辑 .env 填入真实配置
   ```

2. **Railway/Vercel**: 使用平台提供的环境变量管理
   - 敏感信息不要提交到代码仓库
   - 使用强随机密码和 Secret

3. **生产环境**: 使用密钥管理服务
   - AWS Secrets Manager
   - HashiCorp Vault
   - Google Secret Manager

---

## 监控与日志

### 健康检查端点

```bash
# 后端健康检查
curl https://your-backend.railway.app/api/health

# 预期响应
{
  "status": "UP",
  "timestamp": "2026-08-28T10:30:00",
  "service": "kuakua-mirror"
}
```

### Railway 监控

Railway 提供的监控指标：

1. **访问 Metrics 标签**查看：
   - CPU 使用率
   - 内存使用量
   - 网络流量
   - 响应时间

2. **设置告警**（Pro 套餐）：
   - CPU 使用率 > 80%
   - 内存使用 > 90%
   - 应用崩溃

### Vercel 监控

1. **Analytics**（需要升级套餐）：
   - 页面访问量
   - 实际用户性能指标
   - Web Vitals (LCP, FID, CLS)

2. **Speed Insights**：
   - 实时性能监控
   - 性能评分
   - 优化建议

### 日志管理

#### Railway 日志查询

```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 链接项目
railway link

# 实时查看日志
railway logs

# 查看最近 100 行
railway logs --tail 100
```

#### Vercel 日志查询

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 查看实时日志
vercel logs --follow

# 查看特定部署的日志
vercel logs <deployment-url>
```

#### 应用日志级别

在 Railway 环境变量中临时调整：

```env
# 开启 DEBUG 日志
LOGGING_LEVEL_COM_KUAKUA_MIRROR=DEBUG

# 或通过 Spring Boot Actuator（如果启用）
# POST /actuator/loggers/com.kuakua.mirror
# Body: {"configuredLevel": "DEBUG"}
```

### 性能监控工具推荐

#### 开源方案

1. **Sentry** - 错误追踪
   - 免费额度：5000 错误/月
   - 集成简单，支持 Java 和 JavaScript
   - 提供 Source Maps 支持

2. **New Relic** - APM 监控
   - 免费额度：100GB/月数据
   - 深度性能分析
   - 数据库查询追踪

3. **Grafana + Prometheus** - 自托管监控
   - 完全免费
   - 需要自行搭建和维护
   - 强大的可视化能力

#### 集成示例 - Sentry

**后端集成** (`pom.xml`):

```xml
<dependency>
    <groupId>io.sentry</groupId>
    <artifactId>sentry-spring-boot-starter-jakarta</artifactId>
    <version>7.0.0</version>
</dependency>
```

**配置** (`application.yml`):

```yaml
sentry:
  dsn: ${SENTRY_DSN}
  environment: ${SPRING_PROFILES_ACTIVE}
  traces-sample-rate: 1.0
```

**前端集成**:

```bash
cd web
pnpm add @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### 自定义监控脚本

#### 健康检查 Cron 任务

创建 `monitor.sh`:

```bash
#!/bin/bash

BACKEND_URL="https://your-backend.railway.app"
FRONTEND_URL="https://your-app.vercel.app"
WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# 检查后端
if ! curl -f -s "${BACKEND_URL}/api/health" > /dev/null; then
    curl -X POST "${WEBHOOK_URL}" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"⚠️ Backend is DOWN: ${BACKEND_URL}\"}"
fi

# 检查前端
if ! curl -f -s "${FRONTEND_URL}" > /dev/null; then
    curl -X POST "${WEBHOOK_URL}" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"⚠️ Web is DOWN: ${FRONTEND_URL}\"}"
fi
```

使用 GitHub Actions 定时运行：

`.github/workflows/health-check.yml`:

```yaml
name: Health Check

on:
  schedule:
    - cron: "*/5 * * * *" # 每 5 分钟检查一次
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Check Backend
        run: |
          curl -f ${{ secrets.BACKEND_URL }}/api/health || exit 1

      - name: Check Web
        run: |
          curl -f ${{ secrets.FRONTEND_URL }} || exit 1
```

---

## 安全建议

### 1. API Key 和密钥管理

#### 不要做的事：

```java
// ❌ 不要硬编码 API Key
String apiKey = "sk-proj-abc123...";

// ❌ 不要提交 .env 文件到 Git
git add .env  // 危险！
```

#### 正确做法：

```java
// ✅ 使用环境变量
@Value("${openai.api.key}")
private String apiKey;

// ✅ 确保 .env 在 .gitignore 中
echo ".env" >> .gitignore
```

#### 定期轮换密钥

```bash
# 1. 在 OpenAI 平台创建新 API Key
# 2. 更新 Railway 环境变量
# 3. 触发重新部署
# 4. 确认新 Key 工作后删除旧 Key
```

### 2. 数据库安全

#### Supabase 安全配置

1. **启用 Row Level Security (RLS)**:

```sql
-- 在 Supabase SQL Editor 中执行
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "Users can only see their own data"
ON users FOR SELECT
USING (auth.uid() = id);
```

2. **限制数据库访问**:
   - 使用只读用户进行查询
   - 为不同环境使用不同的数据库
   - 启用 SSL 连接

3. **备份策略**:
   - Supabase 每日自动备份（保留 7 天）
   - 手动备份：Dashboard → Database → Backups

#### 密码安全

```bash
# 生成强密码（至少 16 字符）
openssl rand -base64 24

# 定期更换数据库密码（每 90 天）
# 1. 在 Supabase Dashboard 重置密码
# 2. 更新所有服务的环境变量
# 3. 重新部署
```

### 3. 网络安全

#### HTTPS/WSS 强制

Railway 和 Vercel 自动提供 SSL 证书，确保：

1. **前端配置**使用 HTTPS:

```typescript
// next.config.ts
const config = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ]
  },
}
```

2. **后端配置**只允许 HTTPS（生产环境）:

```yaml
# application-prod.yml
server:
  ssl:
    enabled: false # Railway 在负载均衡层处理 SSL
  forward-headers-strategy: native # 信任 X-Forwarded-* 头
```

#### CORS 配置

```java
// 生产环境严格配置
@Configuration
public class SecurityConfig {

    @Value("${allowed.origins}")
    private String[] allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}
```

### 4. 速率限制

#### 后端速率限制

使用 Spring Boot Starter 集成：

```xml
<dependency>
    <groupId>com.github.vladimir-bukhtoyarov</groupId>
    <artifactId>bucket4j-core</artifactId>
    <version>8.10.1</version>
</dependency>
```

```java
@Component
public class RateLimitFilter implements Filter {

    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();

    private Bucket createNewBucket() {
        return Bucket.builder()
            .addLimit(Limit.of(100, Duration.ofMinutes(1)))
            .build();
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        String ip = httpRequest.getRemoteAddr();

        Bucket bucket = cache.computeIfAbsent(ip, k -> createNewBucket());

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            HttpServletResponse httpResponse = (HttpServletResponse) response;
            httpResponse.setStatus(429);
        }
    }
}
```

#### Vercel 速率限制

Vercel Edge Middleware 实现：

```typescript
// middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const rateLimit = new Map<string, { count: number; resetTime: number }>()

export function middleware(request: NextRequest) {
  const ip = request.ip ?? "anonymous"
  const now = Date.now()
  const limit = 100 // 每分钟 100 次请求
  const window = 60 * 1000 // 1 分钟

  const record = rateLimit.get(ip)

  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + window })
    return NextResponse.next()
  }

  if (record.count >= limit) {
    return new NextResponse("Too Many Requests", { status: 429 })
  }

  record.count++
  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}
```

### 5. 日志安全

#### 不要记录敏感信息

```java
// ❌ 错误做法
log.info("User login: {}, password: {}", username, password);

// ✅ 正确做法
log.info("User login attempt: {}", username);

// ✅ 脱敏处理
log.info("API Key: {}****", apiKey.substring(0, 8));
```

#### 日志轮转和清理

```yaml
# application-prod.yml
logging:
  file:
    name: /app/logs/application.log
  logback:
    rollingpolicy:
      max-file-size: 100MB
      max-history: 30 # 保留 30 天
      total-size-cap: 3GB
      clean-history-on-start: true
```

### 6. 依赖安全

#### 定期更新依赖

```bash
# 检查过期依赖
cd backend
./mvnw versions:display-dependency-updates

cd web
pnpm outdated

# 检查安全漏洞
./mvnw dependency-check:check
pnpm audit
```

#### GitHub Dependabot

创建 `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "maven"
    directory: "/backend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

  - package-ecosystem: "npm"
    directory: "/web"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

---

## 故障排查

### 云平台部署问题

#### Railway 后端部署问题

##### 问题 1: 构建失败 - "Java version mismatch"

**症状**:

```
Error: Java version 17 detected, but version 21 required
```

**解决方案**:

1. 在 Railway 项目根目录创建 `nixpacks.toml`（如果不存在）:

```toml
[phases.setup]
nixPkgs = ["jdk21"]
```

2. 或在 `backend/system.properties` 中指定：

```properties
java.runtime.version=21
```

##### 问题 2: 数据库连接失败

**症状**:

```
Failed to obtain JDBC Connection
Connection refused: db.xxx.supabase.co:5432
```

**排查步骤**:

```bash
# 检查 DATABASE_URL 格式
echo $DATABASE_URL
# 应该是: jdbc:postgresql://host:port/database

# 测试数据库连接（本地）
psql "postgresql://postgres:password@host:port/postgres"
```

**解决方案**:

- 确认 `DATABASE_URL` 包含 `jdbc:` 前缀
- 检查 Supabase 数据库是否处于暂停状态（免费版会自动暂停）
- 验证密码中是否包含特殊字符（需要 URL 编码）
- 确认使用了连接池地址（推荐）而非直接连接

##### 问题 3: 应用无法访问 - 502 Bad Gateway

**症状**: Railway 部署成功，但访问返回 502

**排查步骤**:

1. 检查 Railway Logs 查看应用是否真正启动
2. 确认应用监听的端口是否使用 `$PORT` 环境变量

**解决方案**:

```bash
# Start Command 必须包含 -Dserver.port=$PORT
java -Dserver.port=$PORT -jar target/mirror-backend-1.0.0.jar
```

在 `application.yml` 中配置：

```yaml
server:
  port: ${PORT:8080}
```

##### 问题 4: 环境变量未生效

**症状**: 应用启动但使用默认配置，未读取环境变量

**解决方案**:

1. 在 Railway Variables 页面确认变量已保存
2. 修改变量后需要重新部署（点击 Redeploy）
3. 检查变量名拼写是否正确（区分大小写）

#### Vercel 前端部署问题

##### 问题 1: 构建失败 - "Module not found"

**症状**:

```
Error: Cannot find module 'next'
```

**解决方案**:

1. 确认 Root Directory 设置为 `web`
2. 检查 Install Command：
   - 如果使用 pnpm: `pnpm install`
   - 如果使用 npm: `npm install`
3. 在项目设置中启用 "Include source files outside of the Root Directory in the Build Step"（monorepo 项目需要）

##### 问题 2: API 请求失败 - CORS 错误

**症状**: 浏览器控制台显示

```
Access to fetch at 'https://backend.railway.app/api/...' from origin 'https://app.vercel.app' has been blocked by CORS policy
```

**解决方案**:

1. 在 Railway 后端添加前端域名到 CORS 配置：

```env
WEBSOCKET_ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-git-main.vercel.app
```

2. 注意 Vercel 的预览部署有不同的域名格式：
   - Production: `your-app.vercel.app`
   - Preview (branch): `your-app-git-branch.vercel.app`
   - Preview (PR): `your-app-pr-123.vercel.app`

3. 可以使用通配符（仅开发/测试环境）：

```env
WEBSOCKET_ALLOWED_ORIGINS=https://*.vercel.app
```

##### 问题 3: 环境变量在客户端未定义

**症状**: `process.env.NEXT_PUBLIC_API_URL` 返回 `undefined`

**解决方案**:

1. 环境变量必须以 `NEXT_PUBLIC_` 开头才能在客户端访问
2. 修改环境变量后需要重新部署
3. 确认在 Vercel Dashboard 中变量应用到了正确的环境（Production/Preview/Development）

##### 问题 4: 页面显示旧内容

**症状**: 代码更新后，访问 Vercel 仍显示旧版本

**解决方案**:

1. 清除浏览器缓存（Ctrl+Shift+R 或 Cmd+Shift+R）
2. 检查 Vercel Deployment 状态，确认最新部署已完成
3. 如果是 Preview 部署，确认访问的是正确的 URL

#### Supabase 数据库问题

##### 问题 1: 数据库连接超时

**症状**:

```
org.postgresql.util.PSQLException: Connection timed out
```

**解决方案**:

1. 免费版 Supabase 项目在 7 天无活动后会暂停，访问 Dashboard 恢复
2. 检查 Railway 服务所在区域与 Supabase 区域是否相近（减少延迟）
3. 使用连接池地址而非直接连接

##### 问题 2: 认证失败 - "password authentication failed"

**症状**:

```
FATAL: password authentication failed for user "postgres"
```

**解决方案**:

1. 在 Supabase Dashboard → Settings → Database 重置数据库密码
2. 更新 Railway 环境变量中的 `DATABASE_PASSWORD`
3. 如果密码包含特殊字符，进行 URL 编码：

```bash
# 例如：密码 p@ss&word 应编码为 p%40ss%26word
```

##### 问题 3: SSL 连接错误

**症状**:

```
SSL connection error: The server does not support SSL
```

**解决方案**:
在连接字符串末尾添加 SSL 参数：

```
jdbc:postgresql://host:port/postgres?sslmode=require
```

或在 `application.yml` 中配置：

```yaml
spring:
  datasource:
    url: ${DATABASE_URL}?sslmode=require
```

##### 问题 4: 迁移文件执行失败

**症状**: Flyway 迁移失败，表已存在

**解决方案**:

1. 检查 Supabase 是否已有表结构（可能是之前手动创建的）
2. 方案 A：清空数据库（慎用）：

```sql
-- 在 Supabase SQL Editor 中执行
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

3. 方案 B：跳过已执行的迁移，修改 Flyway baseline

### 常见应用问题

#### 问题 1: WebSocket 无法连接

**症状**: 前端控制台显示 WebSocket 连接失败

**排查步骤**:

```bash
# 测试 WebSocket 端点（需安装 wscat）
npm install -g wscat
wscat -c wss://your-backend.railway.app/v1/realtime

# 或使用在线工具：https://www.websocket.org/echo.html
```

**解决方案**:

1. 确认后端 WebSocket 配置正确
2. 检查 CORS/Origin 配置
3. Railway 会自动处理 WebSocket 升级，无需额外配置

#### 问题 2: OpenAI API 调用失败

**症状**: 应用启动正常，但 AI 对话无响应

**排查步骤**:

```bash
# 检查 API Key（本地）
echo $OPENAI_API_KEY

# 测试 OpenAI API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**解决方案**:

- 验证 API Key 有效性（OpenAI Platform → API Keys）
- 检查 OpenAI 账户余额
- 确认 API Key 权限包含所需的模型访问

#### 问题 3: JWT 认证失败

**症状**: 用户登录后立即掉线，或提示 token 无效

**解决方案**:

1. 确认 `JWT_SECRET` 长度至少 32 字符
2. 检查前后端是否使用相同的 `JWT_SECRET`
3. 验证 `JWT_EXPIRATION` 设置合理（推荐 7 天 = 604800000 毫秒）

#### 问题 4: 静态资源 404

**症状**: Vercel 部署后，图片或其他静态资源无法加载

**解决方案**:

1. 静态资源应放在 `web/public` 目录
2. 访问路径使用 `/image.png` 而非 `/public/image.png`
3. 检查文件名大小写（Linux 区分大小写）

### 性能问题

#### 问题 1: 响应速度慢

**排查步骤**:

1. 检查 Railway 日志中的请求耗时
2. 使用浏览器 Network 标签分析慢请求
3. 检查数据库查询是否有 N+1 问题

**优化方案**:

1. 为常用查询添加数据库索引
2. 使用 Redis 缓存热点数据
3. 优化 JPA 查询，使用 `@EntityGraph` 避免懒加载
4. 考虑升级 Railway 套餐（免费版 CPU/内存有限）

#### 问题 2: 冷启动时间长

**症状**: Railway 应用在一段时间不活动后，首次访问很慢

**说明**: Railway 免费版会在 5 分钟无请求后将应用置为睡眠状态

**解决方案**:

1. 升级到 Railway Developer 套餐（$5/月）
2. 使用定时任务保持应用活跃：

```bash
# 使用外部 cron 服务（如 cron-job.org）每 4 分钟访问一次
GET https://your-backend.railway.app/api/health
```

### 日志查看

#### Railway 日志

```bash
# 在 Railway Dashboard
1. 点击服务
2. 进入 "Deployments" 标签
3. 点击最新部署查看实时日志

# 使用 Railway CLI
railway logs
```

#### Vercel 日志

```bash
# 在 Vercel Dashboard
1. 进入项目
2. 点击 "Deployments"
3. 点击具体部署查看构建和运行时日志

# 使用 Vercel CLI
vercel logs <deployment-url>
```

#### 浏览器调试

```javascript
// 在浏览器控制台查看网络请求
// F12 → Network 标签

// 查看 WebSocket 消息
// F12 → Network → WS 标签 → 点击连接查看消息

// 查看环境变量（仅 NEXT_PUBLIC_* 可见）
console.log(process.env.NEXT_PUBLIC_API_URL)
```

---

## 快速参考

### 部署检查清单

#### 部署前准备

- [ ] 注册 Supabase 账号并创建项目
- [ ] 注册 Railway 账号并连接 GitHub
- [ ] 注册 Vercel 账号并连接 GitHub
- [ ] 获取 OpenAI API Key（确保有余额）
- [ ] 准备强随机密码用于 JWT_SECRET
- [ ] 项目代码已推送到 GitHub

#### Supabase 配置

- [ ] 创建数据库项目并记录密码
- [ ] 获取连接池 URL（推荐）或直接连接 URL
- [ ] 执行数据库迁移脚本或等待 Flyway 自动执行
- [ ] （可选）配置 Row Level Security
- [ ] 测试数据库连接

#### Railway 后端部署

- [ ] 创建新项目并连接 GitHub 仓库
- [ ] 设置 Root Directory 为 `backend`
- [ ] 配置所有必需环境变量（见下方列表）
- [ ] 等待构建完成（3-5 分钟）
- [ ] 生成公共域名
- [ ] 测试健康检查端点：`/api/health`
- [ ] 检查日志确认应用正常启动

#### Vercel 前端部署

- [ ] 创建新项目并连接 GitHub 仓库
- [ ] 设置 Root Directory 为 `web`
- [ ] 配置环境变量（NEXT_PUBLIC_API_URL 等）
- [ ] 等待构建完成（2-3 分钟）
- [ ] 访问部署 URL 测试
- [ ] 检查浏览器控制台确认无 CORS 错误
- [ ] （可选）配置自定义域名

#### 部署后验证

- [ ] 前端可以正常访问
- [ ] 后端 API 可以正常响应
- [ ] WebSocket 连接成功
- [ ] 数据库读写正常
- [ ] OpenAI API 调用成功
- [ ] 用户注册登录流程正常
- [ ] 移动端测试（如果有）

### 必需环境变量速查

#### Railway 后端

```env
# 数据库（从 Supabase 复制）
DATABASE_URL=jdbc:postgresql://postgres.[REF]:[PASS]@[HOST]:6543/postgres
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=[YOUR_PASSWORD]

# OpenAI
OPENAI_API_KEY=sk-proj-[YOUR_KEY]

# JWT（生成 32+ 字符随机字符串）
JWT_SECRET=[RANDOM_STRING_32_CHARS]
JWT_EXPIRATION=604800000

# CORS（添加你的 Vercel 域名）
WEBSOCKET_ALLOWED_ORIGINS=https://[YOUR_APP].vercel.app

# 管理员
ADMIN_PASSWORD=[SECURE_PASSWORD]

# Spring
SPRING_PROFILES_ACTIVE=prod
```

#### Vercel 前端

```env
# 后端 API（从 Railway 复制）
NEXT_PUBLIC_API_URL=https://[YOUR_APP].up.railway.app
NEXT_PUBLIC_WS_URL=wss://[YOUR_APP].up.railway.app
```

### 常用命令

#### 本地开发

```bash
# 启动后端（开发模式）
cd backend
./mvnw spring-boot:run

# 启动前端（开发模式）
cd web
pnpm dev

# 构建后端
cd backend
./mvnw clean package -DskipTests

# 构建前端
cd web
pnpm build
```

#### Railway CLI

```bash
# 安装
npm i -g @railway/cli

# 登录
railway login

# 链接项目
railway link

# 查看日志
railway logs

# 部署
railway up
```

#### Vercel CLI

```bash
# 安装
npm i -g vercel

# 登录
vercel login

# 部署
cd web
vercel

# 部署到生产环境
vercel --prod

# 查看日志
vercel logs
```

#### 数据库操作

```bash
# 连接 Supabase 数据库（本地）
psql "postgresql://postgres:[PASS]@[HOST]:6543/postgres"

# 执行迁移（Maven）
cd backend
./mvnw flyway:migrate

# 查看迁移状态
./mvnw flyway:info
```

### 价格参考（2026 年）

#### Supabase

- **免费版**：500MB 数据库、1GB 文件存储、50,000 月活用户
- **Pro 版**：$25/月，8GB 数据库、100GB 文件存储、100,000 月活用户

#### Railway

- **免费版**：$5 免费额度/月，服务会在无活动后休眠
- **Developer 版**：$5/月 + 使用费，无休眠，更高资源限制
- 计费方式：按实际使用的 CPU/内存/网络计费

#### Vercel

- **Hobby 版**（免费）：适合个人项目，100GB 带宽/月
- **Pro 版**：$20/月/用户，1TB 带宽/月，更多功能

#### OpenAI API

- **GPT-4o**：$2.50 / 1M input tokens，$10.00 / 1M output tokens
- **GPT-4o Realtime API**：$5.00 / 1M input tokens，$20.00 / 1M output tokens
- 参考：https://openai.com/api/pricing/

### 升级和维护

#### 代码更新部署

```bash
# 1. 提交代码到 Git
git add .
git commit -m "feat: 新功能"
git push origin main

# 2. Railway 和 Vercel 会自动触发部署

# 3. 如需手动触发：
# Railway: Dashboard → Deployments → Redeploy
# Vercel: Dashboard → Deployments → Redeploy
```

#### 数据库备份

```bash
# Supabase 自动每日备份（保留 7 天）
# 手动备份：Dashboard → Database → Backups → Download

# 使用 pg_dump 手动备份
pg_dump "postgresql://postgres:[PASS]@[HOST]:6543/postgres" > backup.sql

# 恢复备份
psql "postgresql://postgres:[PASS]@[HOST]:6543/postgres" < backup.sql
```

#### 回滚部署

**Railway**:

1. 进入 Deployments 标签
2. 找到之前的成功部署
3. 点击 "..." → Redeploy

**Vercel**:

1. 进入 Deployments 标签
2. 找到之前的成功部署
3. 点击 "..." → Promote to Production

### 技术支持

#### 官方文档

- **Railway**: https://docs.railway.app
- **Vercel**: https://vercel.com/docs
- **Supabase**: https://supabase.com/docs
- **Spring Boot**: https://spring.io/projects/spring-boot
- **Next.js**: https://nextjs.org/docs

#### 社区支持

- **Railway Discord**: https://discord.gg/railway
- **Vercel Discord**: https://vercel.com/discord
- **Supabase Discord**: https://discord.supabase.com

#### 常见问题

如遇到问题，请：

1. 查看本文档的 [故障排查](#故障排查) 部分
2. 检查平台状态页面（Railway/Vercel/Supabase Status）
3. 查看应用日志和错误信息
4. 搜索相关 GitHub Issues
5. 在社区 Discord 寻求帮助

---

## 总结

### 推荐部署架构

```
用户设备
    ↓
Vercel (前端 - Next.js)
    ↓
Railway (后端 - Spring Boot)
    ↓
Supabase (数据库 - PostgreSQL)
    ↓
OpenAI API (AI 服务)
```

### 优势

✅ **快速部署**：15-20 分钟完成全栈部署  
✅ **自动扩展**：根据流量自动调整资源  
✅ **全球 CDN**：Vercel 提供全球边缘节点  
✅ **自动 SSL**：HTTPS 开箱即用  
✅ **Git 集成**：推送代码自动部署  
✅ **成本可控**：免费套餐足够小型项目使用

### 注意事项

⚠️ **数据备份**：定期备份 Supabase 数据库  
⚠️ **成本监控**：关注 Railway 和 OpenAI API 使用量  
⚠️ **安全配置**：保护好所有 API Key 和密钥  
⚠️ **性能监控**：使用 Sentry 等工具监控错误  
⚠️ **日志管理**：定期检查日志发现潜在问题

### 下一步

部署完成后，建议：

1. 配置自定义域名（提升品牌形象）
2. 设置监控和告警（及时发现问题）
3. 启用 CDN 和缓存（提升性能）
4. 实施备份策略（数据安全）
5. 进行压力测试（验证性能）
6. 编写运维文档（团队协作）

---

**文档版本**: v2.0.0  
**最后更新**: 2026-08-28  
**维护者**: KuaKua Mirror Team

**相关文档**:

- [API 文档](./API.md)
- [架构设计](./ARCHITECTURE.md)
- [开发指南](../backend/README.md)
- [前端文档](../web/README.md)
