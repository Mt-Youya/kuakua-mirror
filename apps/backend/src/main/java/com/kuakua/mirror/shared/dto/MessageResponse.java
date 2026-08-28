package com.kuakua.mirror.shared.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 消息响应
 */
@Data
@Builder
public class MessageResponse {

    private Long id;
    private Long momentId;
    private String role;
    private String content;
    private LocalDateTime timestamp;
}
