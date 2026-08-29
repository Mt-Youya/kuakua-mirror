"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { monitorApi } from "@/lib/api"

interface Device {
  deviceId: string
  deviceName: string
  status: "ONLINE" | "OFFLINE"
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  deviceId: string
}

export default function MonitorPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 连接 SSE 流
  useEffect(() => {
    const connectSSE = () => {
      setConnectionStatus("connecting")

      const eventSource = monitorApi.connectMonitorStream({
        onDeviceConnected: (event) => {
          console.log("Device connected:", event)
          setDevices((prev) => {
            // 检查设备是否已存在
            const exists = prev.some((d) => d.deviceId === event.deviceId)
            if (exists) {
              // 更新为在线状态
              return prev.map((d) => (d.deviceId === event.deviceId ? { ...d, status: "ONLINE" as const } : d))
            }
            // 添加新设备
            return [
              ...prev,
              {
                deviceId: event.deviceId,
                deviceName: event.deviceName,
                status: "ONLINE" as const,
              },
            ]
          })

          // 如果还没有选中设备，自动选中第一个
          setSelectedDevice((prev) => prev || event.deviceId)
        },

        onDeviceDisconnected: (event) => {
          console.log("Device disconnected:", event)
          setDevices((prev) =>
            prev.map((d) => (d.deviceId === event.deviceId ? { ...d, status: "OFFLINE" as const } : d))
          )
        },

        onUserMessage: (event) => {
          console.log("User message:", event)
          setMessages((prev) => [
            ...prev,
            {
              id: `${event.deviceId}-${Date.now()}-user`,
              role: "user",
              content: event.content,
              timestamp: event.timestamp,
              deviceId: event.deviceId,
            },
          ])
        },

        onAssistantMessage: (event) => {
          console.log("Assistant message:", event)
          setMessages((prev) => [
            ...prev,
            {
              id: `${event.deviceId}-${Date.now()}-assistant`,
              role: "assistant",
              content: event.content,
              timestamp: event.timestamp,
              deviceId: event.deviceId,
            },
          ])
        },

        onError: (error) => {
          console.error("SSE connection error:", error)
          setConnectionStatus("disconnected")

          // 自动重连（5秒后）
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("Attempting to reconnect...")
            if (eventSourceRef.current) {
              eventSourceRef.current.close()
            }
            connectSSE()
          }, 5000)
        },
      })

      eventSource.onopen = () => {
        console.log("SSE connection opened")
        setConnectionStatus("connected")
      }

      eventSourceRef.current = eventSource
    }

    connectSSE()

    // 清理函数
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [])

  // 根据选中设备过滤消息
  const filteredMessages = selectedDevice ? messages.filter((msg) => msg.deviceId === selectedDevice) : []

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [filteredMessages])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航栏 */}
      <div className="border-b bg-white dark:bg-gray-800 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">实时监控</h1>
            {/* 连接状态指示器 */}
            <Badge
              variant={
                connectionStatus === "connected"
                  ? "success"
                  : connectionStatus === "connecting"
                    ? "secondary"
                    : "destructive"
              }
            >
              {connectionStatus === "connected" ? "已连接" : connectionStatus === "connecting" ? "连接中..." : "已断开"}
            </Badge>
          </div>
          <Link href="/" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">
            返回首页
          </Link>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* 左侧边栏：设备列表 */}
        <div className="w-64 border-r bg-white dark:bg-gray-800 p-4">
          <h2 className="text-lg font-semibold mb-4">在线设备</h2>
          <div className="space-y-2">
            {devices.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                {connectionStatus === "connected" ? "暂无设备连接" : "等待连接..."}
              </div>
            ) : (
              devices.map((device) => (
                <Card
                  key={device.deviceId}
                  className={`cursor-pointer transition-colors ${
                    selectedDevice === device.deviceId
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => setSelectedDevice(device.deviceId)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{device.deviceName}</span>
                      <Badge variant={device.status === "ONLINE" ? "success" : "secondary"}>
                        {device.status === "ONLINE" ? "在线" : "离线"}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{device.deviceId}</div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* 右侧主区域：对话消息流 */}
        <div className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>
              {selectedDevice
                ? `${devices.find((d) => d.deviceId === selectedDevice)?.deviceName || selectedDevice} - 对话记录`
                : "请选择设备"}
            </CardTitle>
          </CardHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-4 pb-4">
              {filteredMessages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  {selectedDevice ? "暂无对话记录" : "请从左侧选择一个设备查看对话"}
                </div>
              ) : (
                filteredMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-lg p-4 ${
                        message.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">{message.role === "user" ? "用户" : "AI"}</span>
                        <span className="text-xs opacity-75">{message.timestamp}</span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
