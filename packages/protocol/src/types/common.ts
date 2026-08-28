/**
 * JSON Envelope - 所有WebSocket消息的统一包装格式
 */
export interface MessageEnvelope<T = any> {
  type: string;
  requestId?: string;
  timestamp: number;
  payload: T;
}

/**
 * 错误消息Payload
 */
export interface ErrorPayload {
  code: string;
  message: string;
}

/**
 * 设备信息
 */
export interface DeviceInfo {
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  macAddress: string;
}

/**
 * 人脸检测Box坐标
 */
export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 分页信息
 */
export interface Pagination {
  total: number;
  limit: number;
  offset: number;
}
