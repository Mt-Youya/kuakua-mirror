# 03: 私有制品存储接缝

**What to build:** 后端能以服务端凭证安全管理 DeviceImage 与 FirmwareRelease 的私有对象制品，业务数据库只保留必要元数据和归属关系。

**Blocked by:** 01: 出厂设备预登记与迁移.

**Status:** ready-for-agent

- [ ] 图片和固件使用私有对象存储，不通过公开 Bucket 暴露。
- [ ] 元数据与对象引用可验证关联到 Device 或 FirmwareRelease，测试不访问生产 Storage。
- [ ] 对象存储配置缺失或失败时返回可处理错误，不泄露服务端凭证。
