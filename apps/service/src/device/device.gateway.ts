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
import { DeviceService } from "./device.service"
import { Logger } from "@nestjs/common"

@WebSocketGateway({ path: "/device/ws" })
export class DeviceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(DeviceGateway.name)
  private deviceConnections = new Map<string, any>()

  constructor(private readonly deviceService: DeviceService) {}

  async handleConnection(client: any) {
    this.logger.log(`Device client connected: ${client.id}`)
  }

  async handleDisconnect(client: any) {
    this.logger.log(`Device client disconnected: ${client.id}`)

    // 查找该连接对应的设备ID
    for (const [deviceId, conn] of this.deviceConnections.entries()) {
      if (conn === client) {
        await this.deviceService.updateOnlineStatus(deviceId, false)
        this.deviceConnections.delete(deviceId)
        this.logger.log(`Device ${deviceId} went offline`)
        break
      }
    }
  }

  @SubscribeMessage("register")
  async handleRegister(@MessageBody() data: any, @ConnectedSocket() client: any) {
    try {
      const { deviceId, deviceName, deviceType } = data

      this.logger.log(`Device registering: ${deviceId}`)

      // 注册设备
      const device = await this.deviceService.register({
        deviceId,
        deviceName,
        deviceType,
      })

      // 存储连接
      this.deviceConnections.set(deviceId, client)

      client.send(
        JSON.stringify({
          type: "register_success",
          data: { deviceId: device.deviceId },
        })
      )

      this.logger.log(`Device registered successfully: ${deviceId}`)
    } catch (error) {
      this.logger.error(`Failed to register device: ${error.message}`)
      client.send(
        JSON.stringify({
          type: "error",
          message: "Failed to register device",
        })
      )
    }
  }

  @SubscribeMessage("heartbeat")
  async handleHeartbeat(@MessageBody() data: any, @ConnectedSocket() client: any) {
    const { deviceId } = data
    if (deviceId) {
      await this.deviceService.updateOnlineStatus(deviceId, true)
    }

    client.send(
      JSON.stringify({
        type: "heartbeat_ack",
        timestamp: Date.now(),
      })
    )
  }

  sendToDevice(deviceId: string, message: any) {
    const client = this.deviceConnections.get(deviceId)
    if (client) {
      client.send(JSON.stringify(message))
    } else {
      this.logger.warn(`Device ${deviceId} not connected`)
    }
  }
}
