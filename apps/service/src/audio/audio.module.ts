import { Module } from "@nestjs/common"
import { AudioGateway } from "./audio.gateway"
import { ConversationModule } from "../conversation/conversation.module"
import { AiModule } from "../ai/ai.module"

@Module({
  imports: [ConversationModule, AiModule],
  providers: [AudioGateway],
  exports: [AudioGateway],
})
export class AudioModule {}
