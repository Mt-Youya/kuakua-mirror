/**
 * 设备状态枚举
 */
export enum DeviceStatus {
  OFFLINE = "offline",
  CONNECTING = "connecting",
  IDLE = "idle",
  LISTENING = "listening",
  THINKING = "thinking",
  SPEAKING = "speaking",
  ERROR = "error",
}

/**
 * 设备能力
 */
export type DeviceCapability =
  | "microphone"
  | "speaker"
  | "camera"
  | "face_detection"
  | "display";

/**
 * 音频格式
 */
export enum AudioFormat {
  PCM_S16LE = "pcm_s16le",
}

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

/**
 * OTA状态
 */
export enum OTAStatus {
  DOWNLOADING = "downloading",
  VERIFYING = "verifying",
  INSTALLING = "installing",
  SUCCESS = "success",
  FAILED = "failed",
}
