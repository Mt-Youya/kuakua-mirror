import { Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import OpenAI from "openai"

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)
  private openai: OpenAI

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>("OPENAI_API_KEY"),
    })
  }

  async generateCompletion(messages: Array<{ role: string; content: string }>): Promise<string> {
    try {
      this.logger.log("Generating completion with OpenAI")

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>("OPENAI_MODEL") || "gpt-4",
        messages: messages.map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        })),
        temperature: 0.7,
        max_tokens: 500,
      })

      const response = completion.choices[0]?.message?.content || ""
      this.logger.log("Completion generated successfully")

      return response
    } catch (error) {
      this.logger.error(`OpenAI API error: ${error.message}`)
      throw new Error("Failed to generate AI response")
    }
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      this.logger.log("Transcribing audio with Whisper")

      const file = new File([audioBuffer], "audio.wav", { type: "audio/wav" })

      const transcription = await this.openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        language: "zh",
      })

      this.logger.log("Audio transcribed successfully")
      return transcription.text
    } catch (error) {
      this.logger.error(`Whisper API error: ${error.message}`)
      throw new Error("Failed to transcribe audio")
    }
  }

  async generateSpeech(text: string): Promise<Buffer> {
    try {
      this.logger.log("Generating speech with TTS")

      const response = await this.openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
      })

      const buffer = Buffer.from(await response.arrayBuffer())
      this.logger.log("Speech generated successfully")

      return buffer
    } catch (error) {
      this.logger.error(`TTS API error: ${error.message}`)
      throw new Error("Failed to generate speech")
    }
  }
}
