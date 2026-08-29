# 夸夸镜硬件 API

基础地址：`https://kuakua-api.cyrusdoyle.me`

## 认证与通用约定

| 接口范围 | 必需请求头 |
| --- | --- |
| 健康、版本、激活 | 无 |
| `/api/v1/devices/{deviceId}/**` | `Authorization: Bearer <DeviceToken>` |
| `/api/v1/praise/stream`、`/api/v1/chat/stream`、`/api/v1/tts` | `Authorization: Bearer <DeviceToken>`、`X-Device-ID: <deviceId>` |
| `/audio/{filename}` | `Authorization: Bearer <DeviceToken>` |

`DeviceToken` 在激活或轮换成功时返回。它没有固定过期时间；Token 缺失、无效，或访问其他设备资源时均返回 `401`。设备管理接口成功响应统一为：

```json
{"success":true,"data":{},"timestamp":"2026-08-29T06:00:00Z"}
```

## 公共接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 返回 `status: "UP"` 的存活检查。 |
| GET | `/api/version` | 返回服务版本与名称。 |
| POST | `/api/v1/devices/activate` | 使用出厂一次性码或恢复码激活设备。 |

激活请求：

```json
{
  "activationCode":"factory-one-time-code",
  "deviceInfo":{
    "model":"K10",
    "serialNumber":"K10-0001",
    "firmwareVersion":"1.0.0",
    "macAddress":"AA:BB:CC:DD:EE:FF"
  }
}
```

成功时 `data` 包含 `deviceId`、`token` 与 `message`。一次性码只能使用一次；恢复码会签发新 Token 并立刻废止旧 Token。

## 设备管理接口

所有以下接口中的 `{deviceId}` 必须等于 Token 所属设备。

| 方法 | 路径 | 请求体/参数 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/v1/devices/{deviceId}/token/rotate` | — | 使用当前有效 Token 轮换 Token；响应中的新 Token 立即替代旧 Token。 |
| GET | `/api/v1/devices/{deviceId}/config` | — | 获取音量、亮度、唤醒词、语言、时区、自动更新设置。 |
| PATCH | `/api/v1/devices/{deviceId}/config` | 任意要更新的 `volume`、`brightness`、`wakeWord`、`language`、`timezone`、`autoUpdate` | 局部更新配置。 |
| POST | `/api/v1/devices/{deviceId}/heartbeat` | `uptime`、`memoryUsage`、`cpuUsage`、`temperature` 可选 | 更新在线状态并保留心跳 30 天。 |
| POST | `/api/v1/devices/{deviceId}/images` | `multipart/form-data`，字段 `file` | 上传 JPEG/PNG/WebP，最大 5 MiB；返回 10 分钟私有签名下载 URL。 |
| GET | `/api/v1/devices/{deviceId}/images` | — | 返回本设备图片元数据与签名 URL；图片保留 30 天。 |
| GET | `/api/v1/devices/{deviceId}/ota/check` | — | 查询同型号、stable、且版本严格更高的固件。 |
| POST | `/api/v1/devices/{deviceId}/ota/status` | `version`、`status`、`progress`、可选 `error` | 上报下载/校验/安装结果。 |
| POST | `/api/v1/devices/{deviceId}/logs` | `timestamp`、`level`、`message`、`metadata` | 上传结构化诊断日志。 |
| GET | `/api/v1/devices/{deviceId}/history` | `type`、`start`、`end`，可选 `limit`、`offset` | 查询心跳、OTA 与日志历史。 |

配置更新示例：

```json
{"volume":60,"brightness":75,"autoUpdate":true}
```

轮换 Token 时，路径里的 `{deviceId}` 必须等于当前 Token 对应的设备，且请求头携带旧 Token：

```http
POST /api/v1/devices/{deviceId}/token/rotate HTTP/1.1
Authorization: Bearer <current-token>
```

收到 `data.token` 后，设备应先写入 NVS，再用新 Token 发起后续请求。若旧 Token 已丢失或无效，不能自动换取新 Token，必须使用恢复码调用激活接口。

心跳示例：

```json
{"uptime":3600,"memoryUsage":0.42,"cpuUsage":0.18,"temperature":41.5}
```

OTA 检查成功时，`data` 包含：

```json
{
  "updateAvailable":true,
  "version":"1.2.0",
  "downloadUrl":"https://...",
  "fileSize":1234,
  "checksum":"sha256-hex",
  "manifest":"v1\nmodel=K10\nversion=1.2.0\nsha256=...",
  "signature":"ed25519-base64",
  "releaseNotes":"..."
}
```

设备必须校验固件 SHA-256；`signature` 是对 `manifest` UTF-8 原文的 Ed25519 Base64 签名。`status` 只允许 `downloading`、`verifying`、`installing`、`success`、`failed`，且版本必须是该设备可获得的已发布 OTA。设备负责安装失败回滚。

日志的 `level` 只允许 `DEBUG`、`INFO`、`WARN`、`ERROR`。`metadata` 必填；整条日志不超过 16 KiB，不能包含 Token、音频或图片内容。日志保留 7 天。历史查询的 `type` 为 `all`、`heartbeat`、`ota` 或 `log`，按时间倒序返回，`limit` 为 1–100。

## 百炼模型与临时音频

三个模型接口共用每设备 10 次/分钟限流；超限返回 `429`。请求头 `X-Device-ID`、请求体 `device_id` 与 Token 所属设备必须完全一致。

| 方法 | 路径 | 请求体 | 成功结果 |
| --- | --- | --- | --- |
| POST | `/api/v1/praise/stream` | `device_id`、`image_base64`、可选 `timestamp` | SSE：`status`、`text`、可选 `audio`、`complete`。图片最大 500 KiB。 |
| POST | `/api/v1/chat/stream` | `device_id`、`audio_base64`、`session_id`、可选 `timestamp` | SSE：`status`、`asr_result`、`text`、可选 `audio`、`complete`。音频最大 1 MiB。 |
| POST | `/api/v1/tts` | `device_id`、`text`、可选 `voice`、`format` | JSON：`data.audio_url`、`duration`、`format`、`sample_rate`。文本 1–100 字符。 |
| GET | `/audio/{filename}` | — | 下载同一设备生成的 WAV 临时文件。 |

音频仅保留在服务端本地 10 分钟；过期或不存在返回 `404`。模型流异常会以 SSE `error` 事件返回。

## 已下线接口

`/api/conversations/**` 与 `/api/monitor/**` 已被安全策略拒绝，硬件不得调用。

## 错误码

| HTTP 状态 | 含义 |
| --- | --- |
| 400 | 激活码、请求字段、图片、OTA 状态或诊断日志不合法。 |
| 401 | Token 缺失、无效，或设备归属不一致。 |
| 404 | 临时音频不存在或已过期。 |
| 429 | 模型调用超过每设备 10 次/分钟。 |
| 503 | Supabase 私有对象存储或固件签名配置不可用。 |

## 生产连通性验证（2026-08-29）

验证经 Cloudflare 代理访问生产环境；Railway 当前部署状态为 `SUCCESS`，提交为 `95e9ab8`。

| 类别 | 探测结果 |
| --- | --- |
| `/api/health`、`/api/version` | 均返回 `200`。 |
| 激活（不存在的一次性码） | 返回预期 `400`，未写入任何生产数据。 |
| 全部受保护的设备、百炼和音频路由（无 Token） | 均返回预期 `401`，说明路由和鉴权链路可达。 |
| 已下线的 conversations、monitor 路由（无 Token） | 返回 `401`；带有效 Token 后仍会被安全策略拒绝。 |

有效 Token 的真实图片上传、OTA 下载、百炼调用和音频下载未在生产环境执行，以避免消耗模型额度或写入设备数据；这些行为已由后端自动化测试覆盖。

### 已知浏览器兼容性问题

硬件原生 HTTP 调用不受影响。但当前 CORS 只允许 `GET`、`POST`、`PUT`、`DELETE`、`OPTIONS`：浏览器对 `PATCH /api/v1/devices/{deviceId}/config` 的预检会返回 `403`。若要由浏览器更新配置，需要在后端 CORS 允许方法中加入 `PATCH`。
