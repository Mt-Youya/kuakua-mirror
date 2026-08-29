# API 集成说明

## 概述

Expo APP 已成功连接后端 REST API，实现真实的对话功能。

## 实现功能

✅ 创建 `services/api.ts` 封装后端 API 调用
✅ 实现 `createConversation()`：调用 `POST /api/conversations` 创建会话
✅ 实现 `sendMessage(sessionId, content)`：调用 `POST /api/conversations/{sessionId}/messages` 发送消息
✅ 实现 `getMessages(sessionId)`：调用 `GET /api/conversations/{sessionId}/messages` 查询历史
✅ APP 启动时创建会话，保存 sessionId
✅ 点击发送按钮，调用真实 API 发送消息，收到 AI 回复后更新 UI
✅ 启动时加载历史消息显示在列表中
✅ 配置后端 API 地址（支持开发和生产环境）

## API 配置

### 开发环境

默认连接到本地后端：`http://localhost:8080`

确保后端服务已启动：

```bash
cd backend
./gradlew bootRun
```

### 生产环境

部署到 Railway 后，需要更新 `services/api.ts` 中的 API_BASE_URL：

```typescript
const API_BASE_URL = __DEV__ ? "http://localhost:8080" : "https://your-app.railway.app" // 替换为实际的 Railway URL
```

## 文件结构

```
mobile/
├── services/
│   └── api.ts              # API 服务封装
├── screens/
│   └── ChatScreen.tsx      # 聊天界面（已集成 API）
└── App.tsx                 # 应用入口
```

## API 接口说明

### 1. 创建会话

**请求：** `POST /api/conversations`

**Body：**

```json
{
  "momentId": 123456
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "sessionId": "123456",
    "momentId": 123456,
    "userId": 1
  }
}
```

### 2. 发送消息

**请求：** `POST /api/conversations/{sessionId}/messages`

**Body：**

```json
{
  "content": "今天完成了一个重要的项目！"
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "userMessage": {
      "id": 1,
      "role": "USER",
      "content": "今天完成了一个重要的项目！",
      "createdAt": "2024-01-01T12:00:00"
    },
    "assistantMessage": {
      "id": 2,
      "role": "ASSISTANT",
      "content": "真的很棒！完成重要项目是一件值得庆祝的事情！",
      "createdAt": "2024-01-01T12:00:01"
    }
  }
}
```

### 3. 查询历史消息

**请求：** `GET /api/conversations/{sessionId}/messages?limit=20`

**响应：**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "role": "USER",
      "content": "今天完成了一个重要的项目！",
      "createdAt": "2024-01-01T12:00:00"
    },
    {
      "id": 2,
      "role": "ASSISTANT",
      "content": "真的很棒！完成重要项目是一件值得庆祝的事情！",
      "createdAt": "2024-01-01T12:00:01"
    }
  ]
}
```

## 使用方法

### 在 Expo Go 中测试

1. 确保手机和开发机在同一网络
2. 启动后端服务（端口 8080）
3. 更新 `services/api.ts` 中的 API 地址为开发机 IP：
   ```typescript
   const API_BASE_URL = "http://192.168.1.x:8080" // 替换为你的开发机 IP
   ```
4. 启动 Expo：
   ```bash
   cd mobile
   npm start
   ```
5. 用 Expo Go 扫描二维码

### 功能测试清单

- [ ] APP 启动时自动创建会话
- [ ] 输入消息并点击发送
- [ ] 收到 AI 回复
- [ ] 消息正确显示（用户消息在右边，AI 回复在左边）
- [ ] 重启 APP，历史消息能正确加载
- [ ] 网络错误时显示提示信息
- [ ] 发送消息时按钮显示加载状态

## 错误处理

应用已实现以下错误处理：

1. **会话创建失败**：显示 Alert 提示，用户可重启 APP 重试
2. **消息发送失败**：显示 Alert 提示，临时消息会被移除
3. **历史消息加载失败**：静默失败，不影响发送新消息
4. **网络连接问题**：所有 API 调用失败都会显示友好的错误提示

## 注意事项

1. **开发环境网络配置**：
   - 使用 Expo Go 时，手机必须能访问开发机的 8080 端口
   - 如果使用模拟器，`localhost` 会正确指向开发机
   - 如果使用真机，需要使用开发机的局域网 IP

2. **生产环境**：
   - Railway 部署后会提供 HTTPS 地址
   - 更新 `API_BASE_URL` 中的生产环境地址
   - 确保后端启用 CORS 允许移动端访问

3. **Session 管理**：
   - 当前每次启动 APP 都会创建新会话
   - 后续可以考虑使用 AsyncStorage 持久化 sessionId

## 下一步优化

- [ ] 使用 AsyncStorage 持久化 sessionId
- [ ] 添加下拉刷新加载更多历史消息
- [ ] 实现消息发送失败重试机制
- [ ] 添加网络状态检测
- [ ] 优化加载动画和交互反馈
