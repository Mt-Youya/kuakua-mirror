# ADR-004: MVP 范围简化 - 砍掉 Moment 领域

**状态**: 已接受  
**日期**: 2026-08-28  
**决策者**: 开发团队 + PM 梁嘉欣

## 背景

PRD v0.3 定义了完整的产品功能：

- **此刻页面**：今日夸夸、镜子夸夸、对话入口、记录卡片流
- **成长页面**：主题列表、成长线路径、Milestone 详情
- **回顾页面**：日报、周报、趋势图
- **我的页面**：人格切换、MBTI、内耗标签

对应的数据模型包含 8 个实体：

- User（用户）
- Moment（用户说的话）
- Praise（夸夸回应）
- Conversation（对话消息）
- Theme（主题，如"展示焦虑"）
- Milestone（里程碑，如"M3·安全试水"）
- UserMilestone（用户进度）
- DailyReview（日报）

**时间约束**：MVP 期限 2 天（到 8 月 30 日），需要同时完成：

- Spring Boot 后端（从未运行过，需要调试）
- Next.js 官网（3D 动画 + 监控页面）
- Expo 移动端（对话功能）
- 硬件固件对接
- 部署到 Railway + Vercel + Supabase

**现实冲突**：完整实现 PRD 需要至少 2-3 周。

## 决策

MVP 只保留核心对话功能，砍掉 Moment/Theme/Milestone 领域。

### 保留的功能

#### 1. 实时对话（核心）

- 硬件镜子：按键唤醒 → 语音对话 → 屏幕显示文字
- 手机 APP：打开 APP → 文字/语音对话
- 官网监控页面：实时显示对话状态

#### 2. 对话历史（简化）

- 数据库存储：ConversationSession（会话）+ Message（消息）
- APP 展示：简单的对话记录列表
- 不包含：夸夸生成、主题关联、难度分、闪光时刻提取

#### 3. 设备管理（最小化）

- 设备连接状态管理（DeviceSession，内存）
- 不包含：设备激活、固件升级、多用户识别

### 砍掉的功能（未来迭代）

#### 阶段 1（砍掉，1 周后补）

- **此刻页面的完整功能**：
  - 今日夸夸（需要 AI 生成 + 历史引用逻辑）
  - 镜子夸夸（需要 VL 模型提取状态）
  - "留下"机制（Moment 沉淀 + 难度分）

- **Moment 领域**：
  - Moment（用户说的话）
  - Praise（夸夸回应）
  - 主题关联、难度分

#### 阶段 2（砍掉，2-3 周后补）

- **成长模块**：
  - Theme（主题）
  - Milestone（里程碑）
  - UserMilestone（用户进度）
  - 成长故事导出

- **回顾模块**：
  - DailyReview（日报）
  - 周报
  - 趋势图（难度分曲线）

- **我的页面**：
  - 人格切换
  - MBTI 配置
  - 内耗标签管理

#### 阶段 3（砍掉，未来计划）

- 安全闸门（自伤/伤人检测）
- Onboarding 流程
- 人脸存在感知
- 用户认证和授权

### MVP 数据模型

```sql
-- 设备（持久化，用于生产环境）
CREATE TABLE devices (
    device_id VARCHAR(50) PRIMARY KEY,
    serial_number VARCHAR(100),
    model VARCHAR(50),
    firmware_version VARCHAR(20),
    activated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 对话会话
CREATE TABLE conversation_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(50) UNIQUE NOT NULL,
    device_id VARCHAR(50),  -- 可选，如果是 APP 对话则为空
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    status VARCHAR(20)  -- ACTIVE, COMPLETED, ABANDONED
);

-- 消息（重命名自 Conversation）
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,  -- USER, ASSISTANT
    content TEXT NOT NULL,
    audio_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (session_id) REFERENCES conversation_sessions(session_id)
);

-- 索引
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
```

**不创建的表**（未来迭代才加）：

- users
- moments
- praises
- themes
- milestones
- user_milestones
- daily_reviews

### 代码重构

#### 需要删除/注释的代码

```
backend/src/main/java/com/kuakua/mirror/moment/
  - domain/Moment.java
  - domain/Praise.java
  - domain/Theme.java
  - domain/Milestone.java
  - domain/UserMilestone.java
  - domain/DailyReview.java
  - api/MomentController.java
  - infra/MomentRepository.java (等)
```

#### 需要重命名的代码

```
backend/src/main/java/com/kuakua/mirror/conversation/
  - domain/Conversation.java → domain/Message.java
  - infra/ConversationRepository.java → infra/MessageRepository.java
```

#### 需要新建的代码

```
backend/src/main/java/com/kuakua/mirror/conversation/
  - domain/ConversationSession.java (新)
  - domain/RealtimeConversation.java (新，聚合根)
  - infra/ConversationSessionRepository.java (新)
```

## 替代方案

### 方案 1：完整实现 PRD

做完所有功能再演示。

**为什么拒绝**：

- 2 天时间不可能完成
- 即使通宵也无法保证质量
- 风险太高，可能什么都做不好

### 方案 2：只做后端，不做前端

MVP 只演示后端 API，用 Postman 测试。

**为什么拒绝**：

- 投资人需要看到实物演示（硬件镜子）和用户界面（APP/官网）
- 纯 API 演示说服力不足

### 方案 3：只做前端 mock，不对接真实后端

前端写死假数据，做好看的 UI。

**为什么拒绝**：

- 无法证明技术可行性
- 投资人会问"能不能现场试试"
- 对后续开发没有价值（mock 数据要全部重写）

## 后果

### 正面

- **时间可控**：2 天内可以完成核心功能
- **风险降低**：功能少，测试充分，演示不容易出错
- **技术价值**：做出来的代码都是真实可用的，不是 demo ware
- **聚焦核心**：投资人看到的是"镜子能对话"这个最核心的卖点

### 负面

- **功能不完整**：投资人如果问"主题成长在哪"，需要回答"下周补"
- **PRD 落差**：PM 梁嘉欣需要接受大幅简化的现实
- **代码重构**：删除已经写好的 Moment 相关代码（约 1000 行）

### 风险应对

#### 演示时投资人问："APP 的成长模块在哪？"

**回答**："MVP 先验证核心技术可行性——实时语音对话。成长模块的产品逻辑已经设计好（展示 PRD），我们会在接下来 2 周内实现。今天主要展示硬件和 AI 能力。"

#### 演示时投资人问："这和市面上的语音助手有什么区别？"

**回答**：

1. "硬件形态不同——折叠镜子，镜子 + 屏幕的设计是情绪支持场景的最佳载体。"
2. "未来的差异化在长期陪伴——主题成长线、难度趋势、个性化夸夸，这些都在 PRD 里（展示文档）。"
3. "MVP 先证明技术基础扎实，产品功能会快速迭代。"

#### 团队内部：PM 不接受砍需求

**应对**：

- 今天（8月28日）必须和 PM 梁嘉欣确认 MVP 范围
- 展示时间表：完整实现 PRD 需要 2-3 周，她要的是"能演示"还是"做不完"？
- 如果她坚持要完整功能，提出延期演示到 9 月 2 日（多 3 天）

## 执行检查清单

- [ ] 今晚和 PM 确认 MVP 范围（必须）
- [ ] 删除/注释 Moment 相关代码
- [ ] 重命名 Conversation → Message
- [ ] 创建 ConversationSession 和 RealtimeConversation
- [ ] 更新数据库迁移脚本（只保留 3 张表）
- [ ] 更新 API 文档（删除 Moment 相关接口）
- [ ] 通知前端和移动端开发者：不做成长/回顾模块
- [ ] 准备演示话术（应对投资人关于功能完整性的质疑）

## 相关决策

- ADR-002：RealtimeConversation 聚合根设计
- ADR-005：演示策略和话术（未来创建）
