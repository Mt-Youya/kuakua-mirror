import { AudioFormat } from "../types/enums";
import { MessageEnvelope } from "../types/common";

/**
 * Audio Input Start - 开始音频输入
 */
export interface AudioInputStartPayload {
  streamId: string;
  format: AudioFormat;
  sampleRate: number;
  channels: number;
}

export type AudioInputStartMessage = MessageEnvelope<AudioInputStartPayload>;

/**
 * Audio Input End - 结束音频输入
 */
export interface AudioInputEndPayload {
  streamId: string;
}

export type AudioInputEndMessage = MessageEnvelope<AudioInputEndPayload>;

/**
 * Transcript Final - STT转录结果
 */
export interface TranscriptFinalPayload {
  streamId: string;
  text: string;
  confidence: number;
  language?: string;
}

export type TranscriptFinalMessage = MessageEnvelope<TranscriptFinalPayload>;

/**
 * Assistant Text - AI回复文本
 */
export interface AssistantTextPayload {
  text: string;
  requestId?: string;
}

export type AssistantTextMessage = MessageEnvelope<AssistantTextPayload>;

/**
 * Audio Output Start - 开始音频输出
 */
export interface AudioOutputStartPayload {
  streamId: string;
  format: AudioFormat;
  sampleRate: number;
  channels: number;
}

export type AudioOutputStartMessage = MessageEnvelope<AudioOutputStartPayload>;

/**
 * Audio Output End - 结束音频输出
 */
export interface AudioOutputEndPayload {
  streamId: string;
}

export type AudioOutputEndMessage = MessageEnvelope<AudioOutputEndPayload>;
