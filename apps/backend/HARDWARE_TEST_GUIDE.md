# 硬件测试指南

## 📋 测试设备信息

### 测试设备 #1
- **激活码**: `TEST-ACTIVATION-CODE-001`
- **型号**: `K10`
- **序列号**: `SN20260829001`
- **固件版本**: `1.0.0`
- **MAC地址**: 任意（例如 `AA:BB:CC:DD:EE:01`）

### 测试设备 #2
- **激活码**: `TEST-ACTIVATION-CODE-002`
- **型号**: `K10`
- **序列号**: `SN20260829002`
- **固件版本**: `1.0.0`
- **MAC地址**: 任意（例如 `AA:BB:CC:DD:EE:02`）

### 测试设备 #3
- **激活码**: `TEST-ACTIVATION-CODE-003`
- **型号**: `K10`
- **序列号**: `SN20260829003`
- **固件版本**: `1.0.0`
- **MAC地址**: 任意（例如 `AA:BB:CC:DD:EE:03`）

---

## 🔧 激活接口调用示例

### 请求

```http
POST https://kuakua-api.cyrusdoyle.me/api/v1/devices/activate
Content-Type: application/json

{
  "activationCode": "TEST-ACTIVATION-CODE-001",
  "deviceInfo": {
    "model": "K10",
    "serialNumber": "SN20260829001",
    "firmwareVersion": "1.0.0",
    "macAddress": "AA:BB:CC:DD:EE:01"
  }
}
```

### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "deviceId": "device_test_001",
    "token": "64位十六进制字符串",
    "message": "设备激活成功"
  }
}
```

### 错误响应示例

**激活码无效或已使用 (400)**
```json
{
  "success": false,
  "error": {
    "code": "ACTIVATION_CODE_INVALID",
    "message": "激活码无效或已使用"
  }
}
```

**设备信息不匹配 (400)**
```json
{
  "success": false,
  "error": {
    "code": "ACTIVATION_CODE_INVALID",
    "message": "激活码与设备不匹配"
  }
}
```

---

## ⚠️ 重要说明

### 1. 请求字段格式
- **必须使用嵌套结构**: `deviceInfo` 对象包含所有设备信息
- **字段名使用驼峰命名**: `activationCode`、`serialNumber`、`firmwareVersion`
- **不要使用下划线命名**: ~~`activation_code`~~、~~`serial_number`~~

### 2. 字段匹配规则
- `model` 和 `serialNumber` 必须与激活码关联的设备记录完全匹配
- 大小写敏感
- 不能有多余的空格

### 3. 激活码使用
- 每个激活码只能使用一次
- 使用后会被标记为已消费（`consumed_at` 字段）
- 重复使用会返回 `ACTIVATION_CODE_INVALID` 错误

### 4. Token 使用
- 激活成功后返回的 `token` 是 64 位十六进制字符串
- 必须在后续所有请求中携带：`Authorization: Bearer <token>`
- Token 永久有效，除非使用恢复码重新激活

---

## 🧪 cURL 测试命令

```bash
# 测试设备 #1 激活
curl -X POST https://kuakua-api.cyrusdoyle.me/api/v1/devices/activate \
  -H "Content-Type: application/json" \
  -d '{
    "activationCode": "TEST-ACTIVATION-CODE-001",
    "deviceInfo": {
      "model": "K10",
      "serialNumber": "SN20260829001",
      "firmwareVersion": "1.0.0",
      "macAddress": "AA:BB:CC:DD:EE:01"
    }
  }'

# 使用返回的 token 测试心跳
curl -X POST https://kuakua-api.cyrusdoyle.me/api/v1/devices/device_test_001/heartbeat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <从激活响应中获取的token>" \
  -d '{
    "status": "IDLE",
    "batteryLevel": 100,
    "cpuUsage": 20,
    "memoryUsage": 30,
    "temperature": 45
  }'
```

---

## 📊 数据库初始化

运行以下 SQL 脚本初始化测试数据：

```bash
# 连接到数据库并执行
psql -h <数据库地址> -U <用户名> -d <数据库名> -f test-activation-data.sql
```

或者通过 Supabase Dashboard 的 SQL Editor 执行 `test-activation-data.sql` 文件内容。

---

## ❓ 常见问题

### Q1: 收到 500 错误
**原因**: 数据库中没有测试数据  
**解决**: 执行 `test-activation-data.sql` 初始化测试设备和激活码

### Q2: "激活码与设备不匹配"
**原因**: `model` 或 `serialNumber` 字段不正确  
**解决**: 严格按照上面的测试设备信息填写，注意大小写

### Q3: "激活码无效或已使用"
**原因**: 激活码已经被使用过一次  
**解决**: 使用另一个测试激活码，或重新初始化数据库

### Q4: 401 Unauthorized
**原因**: 后续请求没有携带 token 或 token 格式错误  
**解决**: 确保 `Authorization: Bearer <token>` header 正确

---

## 📞 支持

如有问题，请提供：
1. 完整的请求体（JSON）
2. 完整的响应（包括状态码和响应体）
3. 使用的激活码和序列号
4. 后端日志（如果可以访问）
