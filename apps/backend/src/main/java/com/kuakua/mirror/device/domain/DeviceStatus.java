package com.kuakua.mirror.device.domain;

/**
 * 设备状态枚举
 */
public enum DeviceStatus {
    OFFLINE,      // 离线
    CONNECTING,   // 连接中
    IDLE,         // 空闲
    LISTENING,    // 监听中
    THINKING,     // 思考中
    SPEAKING,     // 说话中
    ERROR         // 错误
}
