# Feature-First 重构计划

## 目标
将传统分层架构重构为Feature-First架构

## Feature划分

### 1. device/ - 设备管理
**api/**
- DeviceController.java (新建) - REST API端点
- DeviceWebSocketHandler.java (从handler/迁移) - WebSocket连接

**domain/**
- Device.java (从model/迁移)
- DeviceStatus.java (新建)
- DeviceConfig.java (新建)
- DeviceSession.java (新建)

**infra/**
- DeviceRepository.java (新建)

### 2. audio/ - 音频处理
**api/**
- AudioWebSocketHandler.java (从websocket/迁移)

**domain/**
- AudioFrame.java (新建)
- AudioFormat.java (新建)

**infra/**
- ASRService.java (从service/迁移)
- TTSService.java (从service/迁移)

### 3. conversation/ - 对话管理
**api/**
- (暂时无REST端点)

**domain/**
- Conversation.java (从model/迁移)
- ConversationItem.java (从model/迁移)
- Message.java (新建)

**infra/**
- ConversationRepository.java (从repository/迁移)
- SessionManager.java (从service/迁移)
- ContextService.java (从service/迁移)

### 4. ai/ - AI服务集成
**api/**
- (AI Provider对外透明，无直接API)

**domain/**
- ChatMessage.java (新建)
- ChatResponse.java (新建)

**infra/**
- LLMService.java (从service/迁移)
- OpenAIService.java (从service/迁移)
- OpenAIRealtimeService.java (从service/迁移)

### 5. user/ - 用户管理
**api/**
- UserController.java (从controller/迁移)

**domain/**
- User.java (从model/迁移)

**infra/**
- UserRepository.java (从repository/迁移)
- JwtService.java (从service/迁移)
- ProfileService.java (从service/迁移)

### 6. moment/ - 时刻记录
**api/**
- MomentController.java (从controller/迁移)

**domain/**
- Moment.java (从model/迁移)
- DailyReview.java (从model/迁移)
- Praise.java (从model/迁移)
- Milestone.java (从model/迁移)
- UserMilestone.java (从model/迁移)

**infra/**
- MomentRepository.java (从repository/迁移)
- DailyReviewRepository.java (从repository/迁移)
- PraiseRepository.java (从repository/迁移)
- MilestoneRepository.java (从repository/迁移)
- UserMilestoneRepository.java (从repository/迁移)

### 7. shared/ - 共享组件
**config/**
- 所有配置类保持原样

**controller/**
- HealthController.java (从controller/迁移)
- MessageController.java (通用消息，从controller/迁移)

**dto/**
- ApiResponse.java (从dto/迁移)
- MessageRequest.java (从dto/迁移)
- MessageResponse.java (从dto/迁移)

**exception/**
- BusinessException.java (保持原样)
- GlobalExceptionHandler.java (保持原样)

**util/**
- IdGenerator.java (从util/迁移)

**model/**
- WebSocketEvent.java (从model/迁移)

### 待删除的旧目录
- controller/ (迁移后删除)
- service/ (迁移后删除)
- repository/ (迁移后删除)
- model/ (迁移后删除)
- handler/ (迁移后删除)
- websocket/ (迁移后删除)
- dto/ (迁移后删除)
- util/ (迁移后删除)
- config/ (移动到shared/config/)
- exception/ (移动到shared/exception/)

### 特殊处理
- openai/ - 移动到 ai/infra/openai/
- realtime/ - 移动到 ai/infra/realtime/
- theme/ - 移动到 moment/domain/ 或删除（看实际使用）

## 迁移步骤
1. 先迁移domain层（model）- 影响最小
2. 再迁移infra层（repository + service）
3. 最后迁移api层（controller + handler + websocket）
4. 验证编译通过
5. 删除旧目录
