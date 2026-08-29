import { MessageEnvelope, ErrorPayload } from "../types/common"

/**
 * Error Message - 统一错误消息
 */
export type ErrorMessage = MessageEnvelope<ErrorPayload>

/**
 * 错误代码常量
 */
export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_MESSAGE: "INVALID_MESSAGE",
  DEVICE_BUSY: "DEVICE_BUSY",
  CAMERA_BUSY: "CAMERA_BUSY",
  MICROPHONE_BUSY: "MICROPHONE_BUSY",
  SPEAKER_BUSY: "SPEAKER_BUSY",
  NETWORK_ERROR: "NETWORK_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]
