import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator"

export class CreateConversationDto {
  @IsNotEmpty()
  @IsNumber()
  momentId: number
}

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  content: string

  @IsOptional()
  @IsString()
  audioUrl?: string

  @IsOptional()
  @IsNumber()
  audioDurationSeconds?: number
}

export class MessageResponseDto {
  id: number
  role: string
  content: string
  createdAt: Date
  audioUrl?: string
  audioDurationSeconds?: number
}
