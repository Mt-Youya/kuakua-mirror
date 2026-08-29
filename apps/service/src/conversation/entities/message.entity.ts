import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm"

export enum MessageRole {
  USER = "USER",
  ASSISTANT = "ASSISTANT",
}

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn("increment")
  id: number

  @Column({ name: "session_id", length: 64 })
  sessionId: string

  @Column({ name: "device_id", length: 64 })
  deviceId: string

  @Column({ name: "moment_id", nullable: true })
  momentId: number

  @Column({ name: "user_id", nullable: true })
  userId: number

  @Column({ type: "varchar", length: 20 })
  role: MessageRole

  @Column({ type: "text" })
  content: string

  @Column({ name: "audio_url", length: 500, nullable: true })
  audioUrl: string

  @Column({ name: "audio_duration_seconds", nullable: true })
  audioDurationSeconds: number

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date
}
