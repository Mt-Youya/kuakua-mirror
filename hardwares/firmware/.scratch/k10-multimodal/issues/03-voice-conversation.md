# 03: Voice Conversation

**What to build:** A K10 user long-presses A, records one Voice Conversation, receives a contextual AI reply, and sees and hears the response without leaving a recording on the device.

**Blocked by:** 01: Secure device bootstrap.

**Status:** implemented — device verification pending

- [ ] The device sends a valid 16 kHz mono PCM16 WAV to the authenticated chat stream.
- [ ] Voice Conversations from one boot reuse one Device Session, while a later boot starts a new Device Session.
- [ ] Backend audio is played when present and backend TTS is used when the stream has text but no audio event.
- [ ] Recording, stream, and playback failures are visible and release the in-memory audio buffer.
