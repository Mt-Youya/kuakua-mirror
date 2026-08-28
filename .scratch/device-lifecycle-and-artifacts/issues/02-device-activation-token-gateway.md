# 02: 设备激活与 Token 网关

**What to build:** Device 使用预登记的序列号和一次性 FactoryActivationCode 首次激活并获得 DeviceToken；后续硬件请求只可访问该 Device 自身的资源。

**Blocked by:** 01: 出厂设备预登记与迁移.

**Status:** ready-for-agent

- [ ] 激活成功消费 FactoryActivationCode、签发新的 DeviceToken，重复使用或不匹配的激活失败。
- [ ] 缺失、无效或跨设备的 DeviceToken 均返回统一的 401，且不进入业务处理。
- [ ] 恢复码激活会撤销同一 Device 的旧 Token。
