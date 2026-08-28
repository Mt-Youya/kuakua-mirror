package com.kuakua.mirror.conversation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 发送消息请求
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {

    @NotBlank(message = "消息内容不能为空")
    private String content;
}
