# 01: 出厂设备预登记与迁移

**What to build:** 开发者可通过内部 CSV 导入预登记 Device、全局唯一序列号和 FactoryActivationCode；现有设备令牌在迁移后失效，设备必须通过恢复码重新激活。

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] FactoryActivationCode 以哈希、一对一序列号和可消费状态持久化，明文不写入数据库或日志。
- [ ] 内部导入流程拒绝重复序列号和已登记的激活码，并可验证导入结果。
- [ ] 迁移不会留下可继续使用的旧 DeviceToken。
