# 02: Photo Interaction

**What to build:** A K10 user short-presses A, receives an AI praise for the captured photo, and sees and hears the response while the photo exists only for that request.

**Blocked by:** 01: Secure device bootstrap.

**Status:** implemented — device verification pending

- [ ] A valid captured JPEG reaches the authenticated praise stream and its SSE text is displayed.
- [ ] The device downloads and plays the authorized backend WAV response.
- [ ] The Photo Interaction reports capture, network, authorization, and stream failures without fabricating an offline result or keeping media locally.
