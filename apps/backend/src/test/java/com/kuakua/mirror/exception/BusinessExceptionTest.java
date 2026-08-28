package com.kuakua.mirror.exception;

import com.kuakua.mirror.shared.exception.BusinessException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class BusinessExceptionTest {

    @Test
    void testBusinessExceptionWithCodeAndMessage() {
        BusinessException exception = new BusinessException("TEST_ERROR", "测试错误");

        assertEquals("TEST_ERROR", exception.getCode());
        assertEquals("测试错误", exception.getMessage());
    }

    @Test
    void testBusinessExceptionWithMessageOnly() {
        BusinessException exception = new BusinessException("测试错误");

        assertEquals("BUSINESS_ERROR", exception.getCode());
        assertEquals("测试错误", exception.getMessage());
    }
}
