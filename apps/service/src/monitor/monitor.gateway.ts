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

@WebSocketGateway({ path: "/monitor/ws" })
export class MonitorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(MonitorGateway.name)
  private monitorClients = new Set<any>()

  handleConnection(client: any) {
    this.logger.log(`Monitor client connected: ${client.id}`)
    this.monitorClients.add(client)
  }

  handleDisconnect(client: any) {
    this.logger.log(`Monitor client disconnected: ${client.id}`)
    this.monitorClients.delete(client)
  }

  @SubscribeMessage("subscribe")
  handleSubscribe(@ConnectedSocket() client: any) {
    client.send(
      JSON.stringify({
        type: "subscribed",
        message: "Successfully subscribed to monitor events",
      })
    )
  }

  broadcastEvent(event: { eventType: string; deviceId?: string; data: any }) {
    const message = JSON.stringify({
      type: "event",
      timestamp: new Date().toISOString(),
      ...event,
    })

    this.monitorClients.forEach((client) => {
      try {
        client.send(message)
      } catch (error) {
        this.logger.error(`Failed to send to monitor client: ${error.message}`)
      }
    })
  }
}
