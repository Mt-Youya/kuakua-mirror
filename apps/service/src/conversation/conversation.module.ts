import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Message])],
  controllers: [ConversationController],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}
