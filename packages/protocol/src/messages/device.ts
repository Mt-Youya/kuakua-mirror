import { DeviceCapability, DeviceStatus } from "../types/enums";
import { FaceBox, MessageEnvelope } from "../types/common";

/**
 * Device Hello消息 - 设备连接握手
 */
export interface DeviceHelloPayload {
  deviceId: string;
  firmwareVersion: string;
  protocolVersion: string;
  capabilities: DeviceCapability[];
}

export type DeviceHelloMessage = MessageEnvelope<DeviceHelloPayload>;

/**
 * Device Ready消息 - Backend握手响应
 */
export interface DeviceReadyPayload {
  sessionId: string;
}

export type DeviceReadyMessage = MessageEnvelope<DeviceReadyPayload>;

/**
 * Device Status消息 - 设备状态更新
 */
export interface DeviceStatusPayload {
  state: DeviceStatus;
  rssi?: number;
  faceDetected?: boolean;
  microphone?: string;
  speaker?: string;
  camera?: string;
}

export type DeviceStatusMessage = MessageEnvelope<DeviceStatusPayload>;

/**
 * Face Detected消息 - 检测到人脸
 */
export interface FaceDetectedPayload {
  confidence: number;
  box?: FaceBox;
}

export type FaceDetectedMessage = MessageEnvelope<FaceDetectedPayload>;

/**
 * Face Lost消息 - 人脸丢失
 */
export interface FaceLostPayload {}

export type FaceLostMessage = MessageEnvelope<FaceLostPayload>;

/**
 * Ping消息 - 心跳检测
 */
export interface PingPayload {}

export type PingMessage = MessageEnvelope<PingPayload>;

/**
 * Pong消息 - 心跳响应
 */
export interface PongPayload {}

export type PongMessage = MessageEnvelope<PongPayload>;
