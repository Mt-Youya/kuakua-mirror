// Types
export * from "./types/common"
export * from "./types/enums"

// Messages
export * from "./messages/device"
export * from "./messages/audio"
export * from "./messages/vision"
export * from "./messages/error"

// Schemas
export * from "./schemas/validation"

/**
 * Protocol版本
 */
export const PROTOCOL_VERSION = "1.0"

/**
 * 音频默认配置
 */
export const DEFAULT_AUDIO_CONFIG = {
  format: "pcm_s16le" as const,
  sampleRate: 16000,
  channels: 1,
}

/**
 * 心跳配置
 */
export const HEARTBEAT_CONFIG = {
  interval: 15000, // 15秒
  timeout: 45000, // 45秒
}

/**
 * WebSocket端点
 */
export const WS_ENDPOINTS = {
  device: "/ws/device",
  realtime: "/v1/realtime",
} as const
