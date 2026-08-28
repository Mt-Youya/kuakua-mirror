# 04: 重命名 Conversation → Message

**What to build:** 将 `Conversation.java` 实体重命名为 `Message.java`，更新所有引用该类的代码，包括 Repository、Service、Controller。数据库表名也相应改为 `messages`。

**Blocked by:** Ticket 03

**Status:** ready-for-agent

**Acceptance criteria:**

- [ ] `Conversation.java` 重命名为 `Message.java`
- [ ] `@Table(name = "conversations")` 改为 `@Table(name = "messages")`
- [ ] `ConversationRepository` 重命名为 `MessageRepository`
- [ ] 所有引用 `Conversation` 类的地方更新为 `Message`
- [ ] Flyway 迁移脚本中表名从 `conversations` 改为 `messages`
- [ ] 编译通过，运行测试无错误
