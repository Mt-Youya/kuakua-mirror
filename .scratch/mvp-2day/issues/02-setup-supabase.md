# 02: 创建 Supabase 项目并配置连接

**What to build:** 在 Supabase 创建新的 PostgreSQL 数据库项目，获取连接字符串，配置到后端 `.env` 文件，验证后端能成功连接。

**Blocked by:** 无（可立即开始）

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] Supabase 账号创建，新建 PostgreSQL 项目（项目名：kuakua-mirror）
- [ ] 获取数据库连接字符串（格式：postgresql://postgres:[password]@[host]:5432/postgres）
- [ ] 将连接字符串配置到 `backend/.env` 的 `DATABASE_URL` 变量
- [ ] 后端重启后日志显示连接 Supabase 成功
- [ ] 在 Supabase SQL Editor 中能看到连接记录
