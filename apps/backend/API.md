# KuaKua Mirror Backend 接口文档

本文档以当前后端代码为准，服务默认地址为 `http://localhost:8080`。

## 可用性与鉴权

`GET /api/health` 是唯一已配置为匿名访问的 HTTP 接口。其余 HTTP 接口都会先经过 Spring Security；当前工程没有实现登录接口或 Bearer Token 认证过滤器，因此匿名调用会得到 `403`。

设备接口的方法内还会校验 `Authorization: Bearer <device-token>`，但要实际调用这些接口，需先补齐全局认证链路。下文保留其已有的业务请求约定，便于后续接入。

## 通用约定

- 请求体使用 `Content-Type: application/json`，上传图片除外。
- 设备令牌头：`Authorization: Bearer <device-token>`。
- 设备日志、心跳中的时间戳均为 Unix 毫秒时间戳。
- 除健康与版本接口外，成功响应使用以下包装：

```json
{
  "success": true,
  "message": "可选的提示信息",
  "data": {},
  "timestamp": "2026-08-28T15:48:49.892749Z"
}
```

业务处理异常可能返回：

```json
{
  "code": "SYSTEM_ERROR",
  "message": "系统内部错误",
  "timestamp": "2026-08-28T15:48:49.892749"
}
```

## 健康与版本

### `GET /api/health`

无需鉴权。用于存活探测。

```json
{
  "service": "kuakua-mirror",
  "timestamp": "2026-08-28T15:48:49.892749",
  "status": "UP"
}
```

### `GET /api/version`

受全局鉴权保护。

```json
{
  "version": "1.0.0",
  "name": "KuaKua Mirror Backend"
}
```

## 设备接口

前缀：`/api/v1/devices`。除激活接口外，以下接口均要求 `Authorization` 头。

### `POST /api/v1/devices/activate`

请求：

```json
{
  "activationCode": "ACTIVATION_CODE",
  "deviceInfo": {
    "model": "mirror-v1",
    "serialNumber": "SN-001",
    "firmwareVersion": "1.0.0",
    "macAddress": "00:11:22:33:44:55"
  }
}
```

响应 `data`：

```json
{
  "deviceId": "device-id",
  "token": "device-token",
  "message": "设备激活成功"
}
```

### `GET /api/v1/devices/{deviceId}/config`

响应 `data`：

```json
{
  "volume": 50,
  "brightness": 50,
  "wakeWord": "夸夸镜",
  "language": "zh-CN",
  "timezone": "Asia/Shanghai",
  "autoUpdate": true
}
```

### `PATCH /api/v1/devices/{deviceId}/config`

请求字段均为可选；响应与读取配置相同。

```json
{
  "volume": 60,
  "brightness": 70,
  "wakeWord": "夸夸镜",
  "language": "zh-CN",
  "timezone": "Asia/Shanghai",
  "autoUpdate": true
}
```

### `POST /api/v1/devices/{deviceId}/heartbeat`

```json
{
  "uptime": 3600,
  "memoryUsage": 0.45,
  "cpuUsage": 0.18,
  "temperature": 42.5
}
```

响应 `data` 为字符串：`"心跳已记录"`。

### `POST /api/v1/devices/{deviceId}/images`

使用 `multipart/form-data`，字段名为 `file`。响应 `data` 为图片 URL。

当前代码尚未接入对象存储，返回的是示例 URL，不应作为真实图片存储结果使用。

### `GET /api/v1/devices/{deviceId}/ota/check`

响应 `data`：

```json
{
  "updateAvailable": false,
  "version": "1.0.0",
  "downloadUrl": null,
  "fileSize": null,
  "checksum": null,
  "releaseNotes": "当前已是最新版本"
}
```

当前 OTA 检查为固定占位实现。

### `POST /api/v1/devices/{deviceId}/ota/status`

```json
{
  "status": "downloading",
  "progress": 42,
  "error": null
}
```

`status` 支持：`downloading`、`verifying`、`installing`、`success`、`failed`。响应 `data`：`"OTA状态已记录"`；当前尚未落库。

### `POST /api/v1/devices/{deviceId}/logs`

```json
{
  "timestamp": 1724831330000,
  "level": "INFO",
  "message": "设备启动完成",
  "metadata": {
    "firmwareVersion": "1.0.0"
  }
}
```

`level` 约定为 `DEBUG`、`INFO`、`WARN`、`ERROR`。响应 `data`：`"日志已接收"`；当前仅写日志，未接入日志存储。

### `GET /api/v1/devices/{deviceId}/history`

查询参数：

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `type` | 是 | 数据类型 |
| `start` | 是 | 起始 Unix 毫秒时间戳 |
| `end` | 是 | 结束 Unix 毫秒时间戳 |
| `limit` | 否 | 默认 `100` |
| `offset` | 否 | 默认 `0` |

响应 `data`：

```json
{
  "records": [
    { "timestamp": 1724831330000, "type": "log", "data": {} }
  ],
  "pagination": { "total": 1, "limit": 100, "offset": 0 }
}
```

当前实现固定返回空记录。

## 对话接口

前缀：`/api/conversations`，全部受全局鉴权保护。控制器从请求属性 `userId` 取用户；当前未提供注入该属性的认证实现，缺失时业务层会暂时使用 `1`。

### `POST /api/conversations`

```json
{ "momentId": 123 }
```

响应 `data`：

```json
{ "sessionId": "123", "momentId": 123, "userId": 1 }
```

`sessionId` 当前实际是 `momentId` 的字符串形式，后续消息接口要求它是数值字符串。

### `POST /api/conversations/{sessionId}/messages`

```json
{ "content": "今天完成了一个重要任务。" }
```

成功响应 `data`：

```json
{
  "userMessage": {
    "id": 1,
    "role": "USER",
    "content": "今天完成了一个重要任务。",
    "createdAt": "2026-08-28T15:48:49"
  },
  "assistantMessage": {
    "id": 2,
    "role": "ASSISTANT",
    "content": "这很棒。",
    "createdAt": "2026-08-28T15:48:50"
  }
}
```

`sessionId` 非数值时返回 `400`。该接口会调用 OpenAI，运行环境需要配置 `OPENAI_API_KEY`。

### `GET /api/conversations/{sessionId}/messages`

查询参数 `limit` 可选，默认 `20`。响应 `data` 是消息数组，字段为 `id`、`role`、`content`、`createdAt`；当前按时间倒序返回。

## 监控 SSE

### `GET /api/monitor/stream`

受全局鉴权保护，响应类型为 `text/event-stream`。每 30 秒发送一条 SSE 注释心跳。

可收到的事件与 `data`：

```text
event: device_connected
data: {"deviceId":"device-id"}

event: device_disconnected
data: {"deviceId":"device-id"}

event: user_message
data: {"deviceId":"123","text":"用户消息"}

event: assistant_message
data: {"deviceId":"123","text":"AI 回复"}
```

## WebSocket

### `ws://localhost:8080/device/ws`

设备协议入口。它不匹配当前安全白名单 `/ws/**`，因此未认证连接会被全局安全规则阻断。

连接后首先发送 `device_info`：

```json
{
  "type": "device_info",
  "deviceId": "device-id",
  "firmwareVersion": "1.0.0",
  "capabilities": ["audio"]
}
```

后续客户端消息：

| `type` | 字段 | 服务端行为 |
| --- | --- | --- |
| `heartbeat` | `timestamp` | 返回 `pong` |
| `audio` | `data`（Base64） | 仅完成 OpenAI 消息转换，转发尚未实现 |
| `audio_end` | 无 | 仅完成消息转换，提交尚未实现 |

服务端可返回：`pong`（`timestamp`）、`audio_response`（`data`、`isFinal`）、`audio_response_end`、`transcript`（`text`）、`response_text`（`text`）、`error`（`code`、`message`）。

### `ws://localhost:8080/ws/audio`

浏览器语音入口，可匿名握手。成功连接后服务端先发送：

```json
{ "type": "hello", "sessionId": "...", "timestamp": 1724831330000 }
```

客户端消息：

| `type` | 字段 | 说明 |
| --- | --- | --- |
| `listen` | `momentId`、`themeId`（均可选） | 开始实时会话 |
| `audio` | `data`（Base64） | 音频数据 |
| `abort` | 无 | 中止会话 |
| `ping` | 无 | 返回 `pong` |

`listen` 依赖 WebSocket 会话属性 `userId`，当前代码中没有握手拦截器设置该属性；因此现状会返回 `auth_error`。接入认证握手后，服务端还可能推送：`listen_started`、`audio_response`、`transcript_delta`、`transcript_complete`、`response_complete`、`speech_started`、`speech_stopped`、`user_transcript`、`error`。

## 已过期说明

README 中的 `ws://localhost:8080/v1/realtime` 及其消息协议在当前代码中没有对应路由；请以本文档列出的 `/device/ws` 和 `/ws/audio` 为准。
