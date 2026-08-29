## Problem Statement

UNIHIKER K10 的拍照夸奖与语音对话分别存在于两个固件项目中，按键、媒体格式、会话和后端音频处理互相冲突。设备需要在同一个清晰的交互中使用已部署的 KuaKua API，同时避免把照片、录音或设备凭证留在源码和本地媒体库中。

## Solution

交付一个独立的 K10 Multimodal 固件。短按 A 发起 Photo Interaction，长按 A 发起 Voice Conversation，B 重连 Wi-Fi。两个 Interaction 分别调用后端的 praise 与 chat SSE 接口，显示并播放响应。Photo Interaction 与 Voice Conversation 都只在请求期间持有 Ephemeral Media。首次启动时，Bootstrap Credential 经后端轮换后保存至设备 NVS；后续启动只使用该设备凭证。

## User Stories

1. As a K10 用户, I want to short-press A to take a photo, so that I can receive an AI praise response.
2. As a K10 用户, I want to long-press A to record a voice turn, so that I can have a spoken conversation with the device.
3. As a K10 用户, I want each voice turn in one boot to reuse the same Device Session, so that follow-up turns retain short-lived context.
4. As a K10 用户, I want a reboot to start a new Device Session, so that an old conversation is not implicitly continued.
5. As a K10 用户, I want the screen to show the AI response, so that I can use the device when audio is hard to hear.
6. As a K10 用户, I want the device to play the backend response audio, so that the interaction is naturally hands-free.
7. As a K10 用户, I want B to reconnect Wi-Fi, so that I can recover from a network change without reflashing.
8. As a K10 用户, I want a clear error screen when camera, network, credentials, recording, or AI processing fails, so that a fabricated offline answer is never mistaken for a live result.
9. As a K10 用户, I want the device to stop listening except during my explicit long-press interaction, so that ambient speech does not start a conversation.
10. As a K10 deployer, I want Photo Interaction to upload valid JPEG Base64 only, so that it conforms to the deployed praise API.
11. As a K10 deployer, I want Voice Conversation to upload a 16 kHz mono PCM16 WAV, so that backend transcription receives the contractually valid audio format.
12. As a K10 deployer, I want backend WAV audio to be downloaded with device authorization and played as WAV, so that the device does not treat it as an unrelated MP3 format.
13. As a K10 deployer, I want captured photos and recordings released after their request, so that the device does not become a local media archive.
14. As a K10 deployer, I want Wi-Fi and bootstrap credentials injected from the local environment, so that no usable secret is committed to the firmware repository.
15. As a K10 deployer, I want the first boot to rotate the Bootstrap Credential and persist the replacement, so that a flashed device does not continue using the bootstrap token.
16. As a K10 deployer, I want subsequent boots to use NVS credentials without another rotation, so that normal startup does not invalidate an active device token.
17. As a backend owner, I want `X-Device-ID`, body `device_id`, and bearer token to identify the same device, so that the API authorization boundary remains intact.
18. As a backend owner, I want client-side request sizes to stay under the photo and audio limits, so that the K10 request-size filter does not reject normal interactions.
19. As a maintainer, I want the photo and voice paths to remain separate modules, so that a change to one interaction does not alter the other interaction's media contract.
20. As a maintainer, I want TLS validation against the observed KuaKua certificate chain, so that HTTPS requests do not silently trust an arbitrary endpoint.

## Implementation Decisions

- The integration is a new root-level firmware project; the two source projects remain as references.
- Photo Interaction owns camera capture, JPEG conversion, and praise SSE submission. Voice Conversation owns explicit recording, WAV construction, Device Session reuse, and chat SSE submission.
- A shared API client owns authenticated SSE and TTS requests. A shared media component owns only in-memory camera/voice buffers and authenticated backend WAV playback.
- The deployed API contract is `POST /api/v1/praise/stream`, `POST /api/v1/chat/stream`, `POST /api/v1/tts`, and authenticated `GET /api/v1/audio/{filename}`. Health is `GET /api/health`.
- Voice upload is a complete 16 kHz mono PCM16 WAV, not a raw I2S buffer. The backend audio event is treated as a WAV URL; TTS is only a fallback when a stream completes without an audio event.
- A Device Session is generated once per boot and reused for all Voice Conversations in that boot. The backend owns its five-minute expiry.
- The device has no automatic VAD, photo history, audio recording history, SD-card persistence, SPIFFS media cache, random compliment fallback, or third-party TTS dependency.
- Bootstrap Credential values are supplied only through the local build environment. On first boot, the firmware calls the existing token-rotation endpoint and stores the replacement in NVS. This follows ADR 0001.
- The current NVS storage is an intentional hardware-security ceiling: flash encryption is the upgrade path for encrypted at-rest credentials.
- The firmware trusts the observed Google Trust Services WE1 certificate chain for the deployed domain instead of disabling TLS validation. The certificate chain must be refreshed before its trust anchor changes.

## Testing Decisions

- The primary and only required seam is device-level behavior: a built firmware on a K10 connected to the deployed backend. A passing check observes buttons, media contracts, SSE response display/playback, and first-boot credential rotation without inspecting internal classes.
- A good test uses a deliberately provisioned test device and test media, asserts API-visible results and user-visible device state, and never logs a bearer token or raw media.
- Build validation is a prerequisite: PlatformIO must compile the firmware with no credentials present, then compile and upload when local environment credentials are available.
- Existing backend controller tests are prior art for request and SSE contracts. The device check should exercise the same contracts rather than duplicate backend unit tests.
- The test pass must verify both an audio event path and the `/api/v1/tts` fallback path, reject disconnected Wi-Fi and missing credentials visibly, and confirm no photo or WAV survives the request lifecycle.

## Out of Scope

- Automatic voice activity detection, wake words, continuous listening, and background recording.
- Local photo/audio albums, SD-card recording retention, sync queues, replay, or offline AI responses.
- Browser configuration UI, OTA, device heartbeat, device log uploads, new backend APIs, model changes, and Railway deployment changes.
- Flash encryption provisioning and credential recovery flows beyond the backend's existing activation/rotation behavior.

## Further Notes

- Railway production was observed healthy: the custom domain served `/api/health` successfully and its active deployment was `SUCCESS`.
- The backend documentation and older tests contain stale non-v1 audio/TTS paths; this firmware follows the current deployed controller contract using `/api/v1`.
- Published locally as Issue 0001 with the `ready-for-agent` label.
