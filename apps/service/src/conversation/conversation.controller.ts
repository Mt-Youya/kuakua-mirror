import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto, SendMessageDto } from './dto/conversation.dto';
import { MessageRole } from './entities/message.entity';

@Controller('api/conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  async createConversation(@Body() createDto: CreateConversationDto) {
    const sessionId = await this.conversationService.createSession(
      createDto.momentId,
    );

    return {
      success: true,
      data: {
        sessionId,
        momentId: createDto.momentId,
      },
      message: 'Conversation created successfully',
    };
  }

  @Get(':sessionId/messages')
  async getMessages(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: number,
  ) {
    const messages = await this.conversationService.getConversationHistory(
      sessionId,
      limit || 50,
    );

    return {
      success: true,
      data: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
        audioUrl: msg.audioUrl,
        audioDurationSeconds: msg.audioDurationSeconds,
      })),
    };
  }

  @Get('moment/:momentId')
  async getConversationsByMoment(@Param('momentId') momentId: number) {
    const messages = await this.conversationService.getConversationsByMoment(
      momentId,
    );

    return {
      success: true,
      data: messages,
    };
  }
}
