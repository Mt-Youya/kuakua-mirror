package com.kuakua.mirror.shared.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 消息发送请求
 */
@Data
public class MessageRequest {

    @NotNull(message = "Moment ID 不能为空")
    private Long momentId;

    @NotBlank(message = "消息内容不能为空")
    private String content;
}
