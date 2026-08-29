import { z } from "zod"
import { DeviceStatus, AudioFormat, LogLevel, OTAStatus } from "../types/enums"

/**
 * 通用Envelope Schema
 */
export const MessageEnvelopeSchema = z.object({
  type: z.string(),
  requestId: z.string().optional(),
  timestamp: z.number(),
  payload: z.any(),
})

/**
 * Device Hello Schema
 */
export const DeviceHelloSchema = z.object({
  type: z.literal("device.hello"),
  timestamp: z.number(),
  payload: z.object({
    deviceId: z.string(),
    firmwareVersion: z.string(),
    protocolVersion: z.string(),
    capabilities: z.array(z.enum(["microphone", "speaker", "camera", "face_detection", "display"])),
  }),
})

/**
 * Device Ready Schema
 */
export const DeviceReadySchema = z.object({
  type: z.literal("device.ready"),
  timestamp: z.number(),
  payload: z.object({
    sessionId: z.string(),
  }),
})

/**
 * Device Status Schema
 */
export const DeviceStatusSchema = z.object({
  type: z.literal("device.status"),
  timestamp: z.number(),
  payload: z.object({
    state: z.nativeEnum(DeviceStatus),
    rssi: z.number().optional(),
    faceDetected: z.boolean().optional(),
    microphone: z.string().optional(),
    speaker: z.string().optional(),
    camera: z.string().optional(),
  }),
})

/**
 * Face Detected Schema
 */
export const FaceDetectedSchema = z.object({
  type: z.literal("face.detected"),
  timestamp: z.number(),
  payload: z.object({
    confidence: z.number().min(0).max(1),
    box: z
      .object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
      })
      .optional(),
  }),
})

/**
 * Face Lost Schema
 */
export const FaceLostSchema = z.object({
  type: z.literal("face.lost"),
  timestamp: z.number(),
  payload: z.object({}),
})

/**
 * Audio Input Start Schema
 */
export const AudioInputStartSchema = z.object({
  type: z.literal("audio.input.start"),
  timestamp: z.number(),
  payload: z.object({
    streamId: z.string(),
    format: z.nativeEnum(AudioFormat),
    sampleRate: z.number(),
    channels: z.number(),
  }),
})

/**
 * Audio Input End Schema
 */
export const AudioInputEndSchema = z.object({
  type: z.literal("audio.input.end"),
  timestamp: z.number(),
  payload: z.object({
    streamId: z.string(),
  }),
})

/**
 * Transcript Final Schema
 */
export const TranscriptFinalSchema = z.object({
  type: z.literal("transcript.final"),
  timestamp: z.number(),
  payload: z.object({
    streamId: z.string(),
    text: z.string(),
    confidence: z.number().min(0).max(1),
    language: z.string().optional(),
  }),
})

/**
 * Camera Capture Schema
 */
export const CameraCaptureSchema = z.object({
  type: z.literal("camera.capture"),
  timestamp: z.number(),
  payload: z.object({
    captureId: z.string(),
    reason: z.string().optional(),
  }),
})

/**
 * Ping Schema
 */
export const PingSchema = z.object({
  type: z.literal("ping"),
  timestamp: z.number(),
  payload: z.object({}),
})

/**
 * Pong Schema
 */
export const PongSchema = z.object({
  type: z.literal("pong"),
  timestamp: z.number(),
  payload: z.object({}),
})

/**
 * Error Schema
 */
export const ErrorSchema = z.object({
  type: z.literal("error"),
  timestamp: z.number(),
  payload: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

/**
 * 验证消息的辅助函数
 */
export function validateMessage<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data)
}

/**
 * 安全验证（返回结果而不是抛出异常）
 */
export function safeValidateMessage<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.error }
  }
}
