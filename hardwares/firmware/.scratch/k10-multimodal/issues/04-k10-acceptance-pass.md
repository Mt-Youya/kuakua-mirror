# 04: K10 acceptance pass

**What to build:** A deployer can verify the complete K10 Multimodal experience on a provisioned device and identify any failure without exposing secrets or retaining user media.

**Blocked by:** 02: Photo Interaction; 03: Voice Conversation.

**Status:** pending provisioned-device verification

- [ ] A device-level pass verifies the build, first-boot credential rotation, B Wi-Fi recovery, and both A-button interactions against the deployed backend.
- [ ] The pass verifies response text and audio, the chat TTS fallback, clear offline/error states, and no persisted photo or recording.
- [ ] Logs and test evidence omit bearer tokens and raw captured media.
