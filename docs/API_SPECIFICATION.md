# 硬件 API 契约

基础地址：`https://kuakua-api.cyrusdoyle.me`。除健康检查与激活外，所有硬件请求必须带：

```http
Authorization: Bearer <DeviceToken>
X-Device-ID: <deviceId>
```

`DeviceToken` 仅在激活响应中返回一次。缺失、无效或 `deviceId` 不属于该 Token 时统一返回 `401`；模型调用超过每设备 10 次/分钟返回 `429`。

## 1. 激活

```http
POST /api/v1/devices/activate
Content-Type: application/json

{"activationCode":"factory-one-time-code","deviceInfo":{"model":"K10","serialNumber":"K10-0001","firmwareVersion":"1.0.0","macAddress":"AA:BB:CC:DD:EE:FF"}}
```

出厂预登记的序列号与一次性码匹配后响应：

```json
{"success":true,"data":{"deviceId":"device_x","token":"<DeviceToken>","message":"设备激活成功"}}
```

激活码不能重复使用。恢复码走同一接口，会签发新 Token 并使旧 Token 立即失效。

## 2. 设备配置与心跳

```http
GET   /api/v1/devices/{deviceId}/config
PATCH /api/v1/devices/{deviceId}/config
POST  /api/v1/devices/{deviceId}/heartbeat
```

心跳 body 可包含 `uptime`、`memoryUsage`、`cpuUsage`、`temperature`。记录保留 30 天。

## 3. 图片

```http
POST /api/v1/devices/{deviceId}/images
Content-Type: multipart/form-data
file=@photo.jpg
```

仅接受 JPEG、PNG、WebP，最大 5 MiB。响应中的 URL 是 10 分钟有效的私有对象签名 URL；上传本身不会调用视觉模型。

```http
GET /api/v1/devices/{deviceId}/images
```

只返回本设备图片元数据与短时下载 URL。图片保留 30 天。

## 4. OTA

```http
GET /api/v1/devices/{deviceId}/ota/check
```

只有同型号、`stable` 且版本严格高于设备当前版本的固件才会返回更新：

```json
{"success":true,"data":{"updateAvailable":true,"version":"1.2.0","downloadUrl":"https://...","fileSize":1234,"checksum":"sha256-hex","manifest":"v1\\nmodel=K10\\nversion=1.2.0\\nsha256=...","signature":"ed25519-base64","releaseNotes":"..."}}
```

固件下载 URL 为 10 分钟有效。`manifest` 的 UTF-8 原文由 `signature`（Ed25519、Base64）签名；设备必须校验 SHA-256 与该签名，并负责安装失败回滚。

```http
POST /api/v1/devices/{deviceId}/ota/status
Content-Type: application/json

{"version":"1.2.0","status":"verifying","progress":60}
```

`status` 只能为 `downloading`、`verifying`、`installing`、`success` 或 `failed`。OTA 状态保留 30 天。

## 5. 诊断日志与历史

```http
POST /api/v1/devices/{deviceId}/logs
Content-Type: application/json

{"timestamp":1730000000000,"level":"WARN","message":"wifi reconnect","metadata":{"reason":"timeout"}}
```

日志必须是结构化诊断数据，单条不超过 16 KiB，不能包含 token、音频或图片字段；保留 7 天。

```http
GET /api/v1/devices/{deviceId}/history?type=all&start=1730000000000&end=1730100000000&limit=100&offset=0
```

`type` 为 `all`、`heartbeat`、`ota` 或 `log`，按时间倒序分页。

## 6. 百炼与音频

```http
POST /api/praise/stream
POST /api/chat/stream
POST /api/tts
GET  /audio/{filename}
```

前三个接口除 `Authorization` 外还必须让 `X-Device-ID` 与 body 的 `device_id` 和 Token 所属设备一致。每个设备三类模型调用合计最多 10 次/分钟。音频下载也需要同一设备 Token，WAV 仅在服务端本地临时保留 10 分钟。

## 错误

| 状态 | 含义 |
| --- | --- |
| 400 | 请求、激活码、图片、OTA 状态或日志不合法 |
| 401 | DeviceToken 缺失、无效或跨设备访问 |
| 404 | 临时音频已过期或不存在 |
| 429 | 每设备模型调用超过 10 次/分钟 |
| 503 | 私有对象存储不可用 |

`/api/conversations/**` 与 `/api/monitor/**` 已下线，硬件不得调用。健康检查为 `GET /api/health`。
