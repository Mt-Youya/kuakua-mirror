import { MessageEnvelope } from "../types/common"

/**
 * Camera Capture Request - 请求拍照
 */
export interface CameraCapturePayload {
  captureId: string
  reason?: string
}

export type CameraCaptureMessage = MessageEnvelope<CameraCapturePayload>

/**
 * Capture Started - 拍照开始
 */
export interface CaptureStartedPayload {
  captureId: string
}

export type CaptureStartedMessage = MessageEnvelope<CaptureStartedPayload>

/**
 * Capture Completed - 拍照完成
 */
export interface CaptureCompletedPayload {
  captureId: string
  imageUrl: string
  width: number
  height: number
  format: string
}

export type CaptureCompletedMessage = MessageEnvelope<CaptureCompletedPayload>

/**
 * Capture Failed - 拍照失败
 */
export interface CaptureFailedPayload {
  captureId: string
  error: string
}

export type CaptureFailedMessage = MessageEnvelope<CaptureFailedPayload>

/**
 * Vision Result - 视觉识别结果
 */
export interface VisionResultPayload {
  captureId: string
  description: string
  objects?: Array<{
    label: string
    confidence: number
    box?: {
      x: number
      y: number
      width: number
      height: number
    }
  }>
}

export type VisionResultMessage = MessageEnvelope<VisionResultPayload>
