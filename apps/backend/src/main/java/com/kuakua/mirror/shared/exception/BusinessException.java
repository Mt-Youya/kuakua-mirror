package com.kuakua.mirror.shared.exception;

import lombok.Getter;

/**
 * 业务异常基类
 */
@Getter
public class BusinessException extends RuntimeException {

    private final String code;
    private final String message;

    public BusinessException(String code, String message) {
        super(message);
        this.code = code;
        this.message = message;
    }

    public BusinessException(String message) {
        this("BUSINESS_ERROR", message);
    }
}
