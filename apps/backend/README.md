# KuaKua Mirror Backend

K10 夸夸镜后端。硬件通过 HTTP/SSE 调用 Java 服务；只有 Java 服务端使用阿里云百炼，不向硬件暴露模型凭证。

## 前置条件

- JDK 21
- Maven 3.6+
- 百炼业务空间已开通视觉、文本、ASR、TTS 模型

在终端环境中设置凭证与音色，勿写入仓库：

```bash
export DASHSCOPE_API_KEY='...'
export DASHSCOPE_TTS_VOICE='...'
```

运行：

```bash
cd /Users/yonjay/codes/hubs/kuakua-mirror/apps/backend
mvn spring-boot:run
```

服务默认监听 `http://localhost:8080`。生成的 WAV 临时保存于系统临时目录下的 `kuakua-mirror-audio`，默认 10 分钟清理；可用 `K10_AUDIO_DIRECTORY` 和 `K10_AUDIO_TTL_MINUTES` 覆盖。

接口契约见 [API_SPECIFICATION.md](../../docs/API_SPECIFICATION.md)，百炼接入说明见 [BAILIAN_JAVA_ADAPTATION.md](../../docs/BAILIAN_JAVA_ADAPTATION.md)。

生产环境还需要在 Railway 的 backend 服务设置 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_IMAGE_BUCKET=device-images`、`SUPABASE_FIRMWARE_BUCKET=device-firmware` 和 `FIRMWARE_SIGNING_PRIVATE_KEY`；前两个 Bucket 必须为 private。服务端密钥不可写入仓库或下发硬件。

内部出厂导入（CSV 表头：`model,serialNumber,firmwareVersion,activationCode,kind`；`kind` 为 `FACTORY` 或 `RECOVERY`）：

```bash
mvn spring-boot:run -Dspring-boot.run.arguments='--spring.main.web-application-type=none --factory.provisioning-csv=/absolute/path/devices.csv'
```

内部发布 stable 固件（私钥为 PKCS#8 Ed25519 Base64，必须从受控环境变量提供）：

```bash
mvn spring-boot:run -Dspring-boot.run.arguments='--spring.main.web-application-type=none --firmware.publish.file=/absolute/path/firmware.bin --firmware.publish.model=K10 --firmware.publish.version=1.2.0 --firmware.publish.notes=稳定性修复'
```
