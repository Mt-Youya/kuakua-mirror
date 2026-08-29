# 01: Secure device bootstrap

**What to build:** A K10 can build without repository secrets, connect to Wi-Fi, rotate its Bootstrap Credential on first boot, persist the replacement in NVS, and let the user retry Wi-Fi with B.

**Blocked by:** None (can start immediately).

**Status:** implemented — device verification pending

- [ ] The firmware builds without Wi-Fi or device credential values committed to the project.
- [ ] A provisioned K10 replaces its Bootstrap Credential once, then starts later with its stored device credential.
- [ ] Missing credentials and disconnected Wi-Fi are visible to the user and do not expose a token.
