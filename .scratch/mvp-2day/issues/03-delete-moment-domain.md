# 03: 删除 Moment 领域代码

**What to build:** 从代码库中删除或注释掉所有与 Moment/Praise/Theme/Milestone/User 相关的代码，包括领域模型、Repository、Controller、Service。后端编译通过，不再包含这些模块。

**Blocked by:** Ticket 01

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] 删除 `backend/src/main/java/com/kuakua/mirror/moment/` 整个包
- [ ] 删除 `backend/src/main/java/com/kuakua/mirror/user/` 整个包
- [ ] 删除或注释掉 Flyway 迁移脚本中与这些表相关的部分（保留 devices、conversation_sessions、messages）
- [ ] 删除其他模块中对 Moment/User 的引用
- [ ] 运行 `./mvnw clean compile` 编译通过，无错误
