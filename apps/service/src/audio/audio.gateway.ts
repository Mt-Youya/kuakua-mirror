import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets"
import { Server } from "ws"
import { Logger } from "@nestjs/common"
import { ConversationService } from "../conversation/conversation.service"
import { AiService } from "../ai/ai.service"
import { MessageRole } from "../conversation/entities/message.entity"

@WebSocketGateway({ path: "/audio/ws" })
export class AudioGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(AudioGateway.name)
  private sessions = new Map<string, any>()

  constructor(
    private readonly conversationService: ConversationService,
    private readonly aiService: AiService
  ) {}

  handleConnection(client: any) {
    this.logger.log(`Audio client connected: ${client.id}`)
  }

  handleDisconnect(client: any) {
    this.logger.log(`Audio client disconnected: ${client.id}`)
  }

  @SubscribeMessage("audio_start")
  async handleAudioStart(@MessageBody() data: any, @ConnectedSocket() client: any) {
    const { sessionId, deviceId } = data
    this.logger.log(`Audio session started: ${sessionId}`)

    this.sessions.set(client.id, { sessionId, deviceId, audioChunks: [] })

    client.send(
      JSON.stringify({
        type: "audio_start_ack",
        sessionId,
      })
    )
  }

  @SubscribeMessage("audio_chunk")
  async handleAudioChunk(@MessageBody() data: any, @ConnectedSocket() client: any) {
    const session = this.sessions.get(client.id)
    if (!session) {
      return
    }

    // 存储音频块
    session.audioChunks.push(Buffer.from(data.chunk, "base64"))
  }

  @SubscribeMessage("audio_end")
  async handleAudioEnd(@ConnectedSocket() client: any) {
    const session = this.sessions.get(client.id)
    if (!session) {
      return
    }

    try {
      this.logger.log(`Processing audio for session: ${session.sessionId}`)

      // 合并音频块
      const audioBuffer = Buffer.concat(session.audioChunks)

      // 转录音频
      const transcription = await this.aiService.transcribeAudio(audioBuffer)
      this.logger.log(`Transcription: ${transcription}`)

      // 保存用户消息
      await this.conversationService.saveMessage(session.sessionId, session.deviceId, MessageRole.USER, transcription)

      // 生成 AI 回复
      const aiResponse = await this.aiService.generateCompletion([{ role: "user", content: transcription }])

      // 保存 AI 消息
      await this.conversationService.saveMessage(session.sessionId, session.deviceId, MessageRole.ASSISTANT, aiResponse)

      // 生成语音
      const speechBuffer = await this.aiService.generateSpeech(aiResponse)

      // 发送响应
      client.send(
        JSON.stringify({
          type: "transcription",
          text: transcription,
        })
      )

      client.send(
        JSON.stringify({
          type: "ai_response",
          text: aiResponse,
          audio: speechBuffer.toString("base64"),
        })
      )

      // 清理
      session.audioChunks = []
    } catch (error) {
      this.logger.error(`Audio processing error: ${error.message}`)
      client.send(
        JSON.stringify({
          type: "error",
          message: "Failed to process audio",
        })
      )
    }
  }
}
