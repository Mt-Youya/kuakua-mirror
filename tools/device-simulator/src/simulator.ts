import WebSocket from "ws"
import axios from "axios"
import {
  DeviceHelloMessage,
  DeviceStatusMessage,
  PingMessage,
  FaceDetectedMessage,
  DeviceStatus,
  PROTOCOL_VERSION,
  HEARTBEAT_CONFIG,
} from "@kuakua/protocol"

/**
 * 设备模拟器配置
 */
interface SimulatorConfig {
  backendUrl: string
  deviceId: string
  activationCode: string
  firmwareVersion: string
  model: string
  serialNumber: string
  macAddress: string
}

/**
 * 设备模拟器
 */
export class DeviceSimulator {
  private config: SimulatorConfig
  private ws: WebSocket | null = null
  private sessionId: string | null = null
  private deviceToken: string | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private pingInterval: NodeJS.Timeout | null = null
  private status: DeviceStatus = DeviceStatus.OFFLINE

  constructor(config: SimulatorConfig) {
    this.config = config
  }

  /**
   * 启动模拟器
   */
  async start() {
    console.log("🚀 设备模拟器启动中...")
    console.log(`   Device ID: ${this.config.deviceId}`)
    console.log(`   Backend: ${this.config.backendUrl}`)

    // 步骤1: 设备激活
    await this.activate()

    // 步骤2: 建立WebSocket连接
    await this.connect()
  }

  /**
   * 设备激活
   */
  private async activate() {
    console.log("\n📱 正在激活设备...")

    try {
      const response = await axios.post(`${this.config.backendUrl}/api/v1/devices/activate`, {
        activationCode: this.config.activationCode,
        deviceInfo: {
          model: this.config.model,
          serialNumber: this.config.serialNumber,
          firmwareVersion: this.config.firmwareVersion,
          macAddress: this.config.macAddress,
        },
      })

      const { deviceId, token } = response.data.data
      this.deviceToken = token

      console.log(`✅ 设备激活成功`)
      console.log(`   Device ID: ${deviceId}`)
      console.log(`   Token: ${token.substring(0, 20)}...`)
    } catch (error: any) {
      console.error(`❌ 设备激活失败:`, error.response?.data || error.message)
      throw error
    }
  }

  /**
   * 建立WebSocket连接
   */
  private connect() {
    return new Promise<void>((resolve, reject) => {
      const wsUrl = this.config.backendUrl.replace("http", "ws") + "/ws/device"
      console.log(`\n🔌 正在连接WebSocket: ${wsUrl}`)

      this.ws = new WebSocket(wsUrl)
      this.status = DeviceStatus.CONNECTING

      this.ws.on("open", () => {
        console.log("✅ WebSocket连接成功")
        this.sendDeviceHello()
        resolve()
      })

      this.ws.on("message", (data: WebSocket.Data) => {
        this.handleMessage(data.toString())
      })

      this.ws.on("close", () => {
        console.log("🔌 WebSocket连接关闭")
        this.status = DeviceStatus.OFFLINE
        this.cleanup()
      })

      this.ws.on("error", (error) => {
        console.error("❌ WebSocket错误:", error.message)
        reject(error)
      })
    })
  }

  /**
   * 发送device.hello
   */
  private sendDeviceHello() {
    const message: DeviceHelloMessage = {
      type: "device.hello",
      timestamp: Date.now(),
      payload: {
        deviceId: this.config.deviceId,
        firmwareVersion: this.config.firmwareVersion,
        protocolVersion: PROTOCOL_VERSION,
        capabilities: ["microphone", "speaker", "camera", "face_detection", "display"],
      },
    }

    console.log("\n📤 发送 device.hello")
    this.sendMessage(message)
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data)
      console.log(`📥 收到消息: ${message.type}`)

      switch (message.type) {
        case "device.ready":
          this.handleDeviceReady(message)
          break
        case "pong":
          console.log("   📡 Pong received")
          break
        case "error":
          console.error(`   ❌ 错误: ${message.payload.code} - ${message.payload.message}`)
          break
        default:
          console.log(`   ⚠️  未处理的消息类型: ${message.type}`)
      }
    } catch (error) {
      console.error("❌ 消息解析失败:", error)
    }
  }

  /**
   * 处理device.ready
   */
  private handleDeviceReady(message: any) {
    this.sessionId = message.payload.sessionId
    this.status = DeviceStatus.IDLE

    console.log(`✅ 设备已就绪`)
    console.log(`   Session ID: ${this.sessionId}`)

    // 启动心跳
    this.startHeartbeat()

    // 启动ping
    this.startPing()

    // 模拟人脸检测
    setTimeout(() => this.simulateFaceDetection(), 5000)
  }

  /**
   * 启动心跳
   */
  private startHeartbeat() {
    console.log(`\n💓 心跳已启动 (${HEARTBEAT_CONFIG.interval}ms)`)

    this.heartbeatInterval = setInterval(async () => {
      try {
        await axios.post(
          `${this.config.backendUrl}/api/v1/devices/${this.config.deviceId}/heartbeat`,
          {
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
            cpuUsage: 0.2,
            temperature: 45.5,
          },
          {
            headers: {
              Authorization: `Bearer ${this.deviceToken}`,
            },
          }
        )
        console.log("💓 心跳已发送")
      } catch (error: any) {
        console.error("❌ 心跳失败:", error.message)
      }
    }, HEARTBEAT_CONFIG.interval)
  }

  /**
   * 启动Ping
   */
  private startPing() {
    console.log(`📡 Ping已启动 (10s)\n`)

    this.pingInterval = setInterval(() => {
      const pingMsg: PingMessage = {
        type: "ping",
        timestamp: Date.now(),
        payload: {},
      }
      this.sendMessage(pingMsg)
      console.log("📡 Ping sent")
    }, 10000)
  }

  /**
   * 模拟人脸检测
   */
  private simulateFaceDetection() {
    console.log("\n👤 模拟人脸检测事件")

    // 人脸出现
    const faceDetectedMsg: FaceDetectedMessage = {
      type: "face.detected",
      timestamp: Date.now(),
      payload: {
        confidence: 0.94,
        box: {
          x: 32,
          y: 40,
          width: 100,
          height: 130,
        },
      },
    }
    this.sendMessage(faceDetectedMsg)
    console.log("   ✅ face.detected sent (confidence: 0.94)")

    // 更新状态为IDLE
    this.updateStatus(DeviceStatus.IDLE)

    // 5秒后人脸消失
    setTimeout(() => {
      const faceLostMsg = {
        type: "face.lost",
        timestamp: Date.now(),
        payload: {},
      }
      this.sendMessage(faceLostMsg)
      console.log("   👋 face.lost sent")
    }, 5000)
  }

  /**
   * 更新设备状态
   */
  private updateStatus(status: DeviceStatus) {
    this.status = status

    const statusMsg: DeviceStatusMessage = {
      type: "device.status",
      timestamp: Date.now(),
      payload: {
        state: status,
        faceDetected: status !== DeviceStatus.OFFLINE,
        microphone: "idle",
        speaker: "idle",
        camera: "ready",
      },
    }

    this.sendMessage(statusMsg)
    console.log(`   📊 状态更新: ${status}`)
  }

  /**
   * 发送消息
   */
  private sendMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.error("❌ WebSocket未连接，无法发送消息")
    }
  }

  /**
   * 清理资源
   */
  private cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  /**
   * 停止模拟器
   */
  stop() {
    console.log("\n🛑 正在停止设备模拟器...")
    this.cleanup()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    console.log("✅ 设备模拟器已停止")
  }
}
