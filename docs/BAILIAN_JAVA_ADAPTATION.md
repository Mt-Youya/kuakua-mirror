# 百炼 Java 接入与 K10 适配结论

更新：2026-08-28。本文只依据阿里云百炼官方文档及本仓库已下载的 `com.alibaba:dashscope-sdk-java:2.22.30` 进行核对；不包含任何 API Key。

## 结论

K10 不应直连任何大模型，也不应持有 `X-API-Key`。硬件只携带 `X-Device-ID` 和业务请求；Java 后端从运行环境读取 `DASHSCOPE_API_KEY`，统一调用百炼。

本项目应保留并使用已有的 DashScope Java SDK，不应把 OpenAI 兼容模式作为主实现。原因是 SDK 已直接覆盖本项目四条链路所需的 `MultiModalConversation`（视觉）、`Generation`（文本）、`Recognition`（ASR）和 `HttpSpeechSynthesizer`（TTS）类；而 K10 上传的是 Base64 音频，官方的 OpenAI 兼容非实时 ASR 仅接受公网可访问的音频 URL，会额外引入上传存储步骤，反而不匹配当前协议。[SDK 安装说明](https://help.aliyun.com/zh/model-studio/install-sdk) [OpenAI 兼容 ASR 限制](https://help.aliyun.com/zh/model-studio/non-realtime-speech-recognition-user-guide)

> `dashscope-sdk-java:2.22.30` 已高于非实时 TTS 文档要求的 `2.22.15`；无需新增 AI SDK 依赖。[非实时 TTS Java SDK](https://help.aliyun.com/zh/model-studio/cosyvoice-tts-java-sdk)

## K10 接口到百炼能力的映射

| K10 接口                            | Java 后端调用                              | 首选模型                             | 调用方式                | 说明                                                                                               |
| ----------------------------------- | ------------------------------------------ | ------------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------- |
| `POST /api/praise/stream`           | `MultiModalConversation.streamCall`        | `qwen3-vl-plus`                      | 流式视觉理解            | 解码 `image_base64` 后作为图片内容与“夸奖”提示词一起提交；将上游文本增量转为现有 SSE `text` 事件。 |
| `POST /api/chat/stream`（ASR）      | `Recognition.call`                         | `qwen-audio-3.0-asr-flash-streaming` | 非流式文件识别          | K10 是整段 WAV Base64 上传，保存为受控临时文件后识别；无需为了这一版 HTTP 接口建立双向音频流。     |
| `POST /api/chat/stream`（LLM）      | `Generation.streamCall`                    | `qwen-plus`                          | 增量流式文本            | 将 ASR 文本和短会话历史输入，增量结果逐块转换为 SSE `text` 事件。                                  |
| `POST /api/tts`，及前两条接口的播报 | `HttpSpeechSynthesizer.callAndReturnAudio` | `qwen-audio-3.0-tts-flash`           | 非流式返回 `ByteBuffer` | 后端将 WAV 写入受控音频目录，再返回现有 `/audio/{filename}` URL。                                  |

模型 ID 是官方示例，不代表每个业务空间、地域和开通状态都可用；上线前应使用百炼的[模型列表接口](https://help.aliyun.com/zh/model-studio/list-models)按 `VU`、`TG`、`ASR`、`TTS` 能力确认实际可用模型。

## 每条能力的官方调用要点

### 视觉图片夸奖

官方 Java 示例使用 `MultiModalConversation`、`MultiModalConversationParam` 与 `streamCall`，模型示例为 `qwen3-vl-plus`，并以 `incrementalOutput(true)` 获得增量文本。[千问 DashScope API 的 Java 多模态流式示例](https://help.aliyun.com/zh/model-studio/qwen-api-via-dashscope)

适配要求：请求中的图片 Base64 必须在 Java 后端解码并校验 MIME、大小和图片可读性；不要把硬件传来的字符串直接拼进提示词或请求 URL。视觉流结束后再触发 TTS，避免对未完成的句子重复生成整段音频。

### 文本对话与 SSE

官方 Java 文本流式用 `Generation.streamCall(GenerationParam)`；`incrementalOutput(true)` 表示每个数据块只带新增文本，适合直接映射为 K10 的 SSE `text` 事件。[千问流式输出 Java 示例](https://help.aliyun.com/zh/model-studio/stream)

`session_id` 仅作为后端会话键，服务端持有有限轮数历史；`device_id` 必须与会话所属设备一致。硬件不传模型名、系统提示词或百炼凭证。

### WAV 语音识别

当前 K10 接口一次上传完整 WAV，故首版选 `Recognition.call(param, file)`：官方示例使用 `RecognitionParam`，`model("qwen-audio-3.0-asr-flash-streaming")`、`format("wav")`、`sampleRate(16000)`。官方同时说明 `Recognition` 也支持双向流式，但那只在硬件改为持续发送音频帧时才需要。[实时 ASR Java SDK](https://help.aliyun.com/zh/model-studio/fun-asr-realtime-java-sdk)

若日后改为实时音频，才改用 `Recognition.streamCall`，并将 K10 输出统一为 PCM 16 kHz；不要把 WAV 文件头拆成 PCM 帧发送。针对现有“≤10 秒整段 WAV”的规范，单次识别更简单、可验证且足够。

### 语音合成与音频下载

官方推荐的非实时 Qwen-Audio-TTS Java 类是 `HttpSpeechSynthesizer`。`callAndReturnAudio` 返回完整 `ByteBuffer`；`streamCall` 可在回调中返回音频分片。官方示例模型为 `qwen-audio-3.0-tts-flash`，该能力仅在北京地域可用。[非实时 TTS Java SDK](https://help.aliyun.com/zh/model-studio/cosyvoice-tts-java-sdk)

K10 当前需要 `/audio/{filename}`，所以首版用完整 `ByteBuffer` 写 WAV 文件即可；不应把百炼临时音频 URL 原样下发给局域网硬件。若首包播报延迟成为实测瓶颈，再把 TTS 改为 SDK 的 `streamCall` 并扩展硬件协议接收音频分片。[非实时 TTS 行为与端点](https://help.aliyun.com/zh/model-studio/non-realtime-tts-user-guide)

旧接口的 `xiaoyun`、`xiaogang` 等发音人名称不是上述 Qwen-Audio-TTS 示例的音色 ID。实施时应先在后端固定一个已开通的百炼 `voice`，或建立白名单映射；不能把客户端任意 `voice` 透传给模型。

## 地域与配置边界

百炼推荐使用业务空间专属域名。北京地域的 SDK HTTP 基地址为 `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1`；Java 可通过 `Constants.baseHttpApiUrl` 配置，多模态 Java 示例也支持在构造 `MultiModalConversation` 时传入该地址。[DashScope API 参考](https://help.aliyun.com/zh/model-studio/qwen-api-via-dashscope)

ASR 的 WebSocket 基地址与 TTS 可用地域也需按同一业务空间配置；API Key 必须只从部署环境的 `DASHSCOPE_API_KEY` 读取，不能写入硬件、接口文档、日志、代码或仓库配置。百炼官方也明确建议将 Key 放到环境变量而非硬编码。[ASR Java SDK 前提条件](https://help.aliyun.com/zh/model-studio/fun-asr-realtime-java-sdk)

## 实施顺序

1. 删除 K10 文档中的 `X-API-Key` 及其 401 语义，保留并校验 `X-Device-ID`；后端保存百炼凭证。
2. 用 DashScope SDK 替换现有 OpenAI 服务和配置，先完成图片夸奖与文本流式；验证 SSE 增量顺序。
3. 接入整段 WAV 的 ASR，再接入非实时 TTS 产出本地 WAV；验证 `/audio/{filename}` 的下载与过期清理。
4. 只有在真实设备测试证明首包语音延迟不可接受时，升级为 ASR/TTS 双向流式，不在首版预建 WebSocket 转发层。
