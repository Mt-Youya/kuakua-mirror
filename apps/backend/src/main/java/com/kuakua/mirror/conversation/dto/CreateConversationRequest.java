package com.kuakua.mirror.conversation.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 创建会话请求
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateConversationRequest {

    @NotNull(message = "momentId 不能为空")
    private Long momentId;
}
