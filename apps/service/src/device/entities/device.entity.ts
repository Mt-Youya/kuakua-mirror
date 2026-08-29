import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity("devices")
export class Device {
  @PrimaryGeneratedColumn("increment")
  id: number

  @Column({ name: "device_id", unique: true, length: 64 })
  deviceId: string

  @Column({ name: "device_name", length: 100, nullable: true })
  deviceName: string

  @Column({ name: "device_type", length: 50 })
  deviceType: string

  @Column({ name: "mac_address", length: 17, nullable: true })
  macAddress: string

  @Column({ name: "firmware_version", length: 50, nullable: true })
  firmwareVersion: string

  @Column({ name: "is_online", default: false })
  isOnline: boolean

  @Column({ name: "last_seen_at", type: "datetime", nullable: true })
  lastSeenAt: Date

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date
}
