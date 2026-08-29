import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Message, MessageRole } from "./entities/message.entity"
import { v4 as uuidv4 } from "uuid"

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>
  ) {}

  async createSession(momentId: number, userId?: number): Promise<string> {
    const sessionId = uuidv4()
    return sessionId
  }

  async saveMessage(
    sessionId: string,
    deviceId: string,
    role: MessageRole,
    content: string,
    options?: {
      momentId?: number
      userId?: number
      audioUrl?: string
      audioDurationSeconds?: number
    }
  ): Promise<Message> {
    const message = this.messageRepository.create({
      sessionId,
      deviceId,
      role,
      content,
      momentId: options?.momentId,
      userId: options?.userId,
      audioUrl: options?.audioUrl,
      audioDurationSeconds: options?.audioDurationSeconds,
    })

    return this.messageRepository.save(message)
  }

  async getConversationHistory(sessionId: string, limit: number = 50): Promise<Message[]> {
    return this.messageRepository.find({
      where: { sessionId },
      order: { createdAt: "ASC" },
      take: limit,
    })
  }

  async getConversationsByMoment(momentId: number): Promise<Message[]> {
    return this.messageRepository.find({
      where: { momentId },
      order: { createdAt: "DESC" },
    })
  }
}
