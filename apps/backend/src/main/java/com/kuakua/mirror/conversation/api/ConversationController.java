package com.kuakua.mirror.conversation.api;

import com.kuakua.mirror.ai.infra.OpenAIService;
import com.kuakua.mirror.conversation.domain.Message;
import com.kuakua.mirror.conversation.dto.*;
import com.kuakua.mirror.conversation.infra.MessageRepository;
import com.kuakua.mirror.monitor.service.MonitorEventService;
import com.kuakua.mirror.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 对话 REST API
 * 提供会话创建、消息发送、历史查询功能
 */
@Slf4j
@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final MessageRepository messageRepository;
    private final OpenAIService openAIService;
    private final MonitorEventService monitorEventService;

    /**
     * 创建新会话
     * POST /api/conversations
     */
    @PostMapping
    public ResponseEntity<ApiResponse<CreateConversationResponse>> createConversation(
            @Valid @RequestBody CreateConversationRequest request,
            @RequestAttribute(value = "userId", required = false) Long userId) {

        log.info("创建会话: userId={}, momentId={}", userId, request.getMomentId());

        // 如果没有 userId，使用默认值（暂时用于测试）
        if (userId == null) {
            userId = 1L;
            log.warn("userId 为空，使用默认值: {}", userId);
        }

        // 生成 sessionId（使用 momentId 作为会话标识）
        String sessionId = UUID.randomUUID().toString();

        CreateConversationResponse response = CreateConversationResponse.builder()
                .sessionId(request.getMomentId().toString())
                .momentId(request.getMomentId())
                .userId(userId)
                .build();

        return ResponseEntity.ok(ApiResponse.success("会话创建成功", response));
    }

    /**
     * 发送消息并获取 AI 回复
     * POST /api/conversations/{sessionId}/messages
     */
    @PostMapping("/{sessionId}/messages")
    public Mono<ResponseEntity<ApiResponse<SendMessageResponse>>> sendMessage(
            @PathVariable String sessionId,
            @Valid @RequestBody SendMessageRequest request,
            @RequestAttribute(value = "userId", required = false) Long userId) {

        log.info("发送消息: sessionId={}, userId={}, content={}", sessionId, userId, request.getContent());

        // 如果没有 userId，使用默认值
        if (userId == null) {
            userId = 1L;
            log.warn("userId 为空，使用默认值: {}", userId);
        }

        Long momentId;
        try {
            momentId = Long.parseLong(sessionId);
        } catch (NumberFormatException e) {
            return Mono.just(ResponseEntity.badRequest()
                    .body(ApiResponse.error("无效的 sessionId")));
        }

        final Long finalUserId = userId;

        return Mono.fromCallable(() -> {
            // 保存用户消息
            Message userMessage = Message.builder()
                    .momentId(momentId)
                    .userId(finalUserId)
                    .role(Message.Role.USER)
                    .content(request.getContent())
                    .build();
            messageRepository.save(userMessage);

            // 广播用户消息事件（使用 sessionId 作为 deviceId）
            monitorEventService.broadcastUserMessage(sessionId, request.getContent());

            return userMessage;
        })
        .flatMap(userMessage -> {
            // 构建系统提示词
            String systemPrompt = "你是一个温暖、有同理心的 AI 助手，名叫夸夸镜。" +
                    "你的任务是倾听用户的分享，给予真诚的鼓励和肯定。" +
                    "请用简洁、温暖的语言回复，让用户感受到被理解和支持。";

            // 调用 OpenAI 生成回复
            return openAIService.generateResponse(request.getContent(), systemPrompt)
                    .map(aiResponse -> {
                        // 保存 AI 回复
                        Message assistantMessage = Message.builder()
                                .momentId(momentId)
                                .userId(finalUserId)
                                .role(Message.Role.ASSISTANT)
                                .content(aiResponse)
                                .build();
                        messageRepository.save(assistantMessage);

                        // 广播 AI 回复事件
                        monitorEventService.broadcastAssistantMessage(sessionId, aiResponse);

                        // 构建响应
                        SendMessageResponse response = SendMessageResponse.builder()
                                .userMessage(toDto(userMessage))
                                .assistantMessage(toDto(assistantMessage))
                                .build();

                        return ResponseEntity.ok(ApiResponse.success("消息发送成功", response));
                    });
        })
        .onErrorResume(e -> {
            log.error("发送消息失败: sessionId={}, userId={}", sessionId, finalUserId, e);
            return Mono.just(ResponseEntity.internalServerError()
                    .body(ApiResponse.error("发送消息失败: " + e.getMessage())));
        });
    }

    /**
     * 查询历史消息
     * GET /api/conversations/{sessionId}/messages
     */
    @GetMapping("/{sessionId}/messages")
    public ResponseEntity<ApiResponse<List<ConversationMessageDto>>> getMessages(
            @PathVariable String sessionId,
            @RequestParam(defaultValue = "20") int limit,
            @RequestAttribute(value = "userId", required = false) Long userId) {

        log.info("查询历史消息: sessionId={}, userId={}, limit={}", sessionId, userId, limit);

        // 如果没有 userId，使用默认值
        if (userId == null) {
            userId = 1L;
            log.warn("userId 为空，使用默认值: {}", userId);
        }

        Long momentId;
        try {
            momentId = Long.parseLong(sessionId);
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("无效的 sessionId"));
        }

        try {
            // 查询消息历史
            List<Message> messages = messageRepository
                    .findByMomentIdOrderByCreatedAtAsc(momentId);

            // 转换为 DTO，按时间倒序，限制数量
            List<ConversationMessageDto> messageDtos = messages.stream()
                    .map(this::toDto)
                    .collect(Collectors.toList());

            // 倒序
            java.util.Collections.reverse(messageDtos);

            // 限制数量
            if (messageDtos.size() > limit) {
                messageDtos = messageDtos.subList(0, limit);
            }

            return ResponseEntity.ok(ApiResponse.success(messageDtos));
        } catch (Exception e) {
            log.error("查询历史消息失败: sessionId={}, userId={}", sessionId, userId, e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("查询历史消息失败: " + e.getMessage()));
        }
    }

    /**
     * 转换为 DTO
     */
    private ConversationMessageDto toDto(Message message) {
        return ConversationMessageDto.builder()
                .id(message.getId())
                .role(message.getRole().name())
                .content(message.getContent())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
