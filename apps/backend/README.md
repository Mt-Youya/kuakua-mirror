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
