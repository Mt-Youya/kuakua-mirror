// API 基础配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";

// 通用请求函数
async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// 设备相关 API
export const deviceApi = {
  // 获取所有设备
  getDevices: () => request<any[]>("/devices"),

  // 获取单个设备
  getDevice: (deviceId: string) => request<any>(`/devices/${deviceId}`),

  // 获取设备状态
  getDeviceStatus: (deviceId: string) =>
    request<any>(`/devices/${deviceId}/status`),

  // 注册设备
  registerDevice: (data: any) =>
    request<any>("/devices/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// 心跳相关 API
export const heartbeatApi = {
  // 发送心跳
  sendHeartbeat: (deviceId: string, data: any) =>
    request<any>(`/heartbeat/${deviceId}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 获取心跳历史
  getHeartbeatHistory: (deviceId: string) =>
    request<any[]>(`/heartbeat/${deviceId}/history`),
};

// 数据相关 API
export const dataApi = {
  // 发送设备数据
  sendData: (deviceId: string, data: any) =>
    request<any>(`/data/${deviceId}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 获取最新数据
  getLatestData: (deviceId: string) =>
    request<any>(`/data/${deviceId}/latest`),

  // 获取历史数据
  getHistoricalData: (deviceId: string, params?: { limit?: number }) =>
    request<any[]>(
      `/data/${deviceId}/history${params?.limit ? `?limit=${params.limit}` : ""}`
    ),
};

// 监控 SSE 事件类型
export interface DeviceConnectedEvent {
  deviceId: string;
  deviceName: string;
  timestamp: string;
}

export interface DeviceDisconnectedEvent {
  deviceId: string;
  timestamp: string;
}

export interface UserMessageEvent {
  deviceId: string;
  content: string;
  timestamp: string;
}

export interface AssistantMessageEvent {
  deviceId: string;
  content: string;
  timestamp: string;
}

export interface MonitorEventHandlers {
  onDeviceConnected?: (event: DeviceConnectedEvent) => void;
  onDeviceDisconnected?: (event: DeviceDisconnectedEvent) => void;
  onUserMessage?: (event: UserMessageEvent) => void;
  onAssistantMessage?: (event: AssistantMessageEvent) => void;
  onError?: (error: Event) => void;
}

// 监控相关 API
export const monitorApi = {
  // 连接监控 SSE 流
  connectMonitorStream: (handlers: MonitorEventHandlers): EventSource => {
    const url = `${API_BASE_URL}/monitor/stream`;
    const eventSource = new EventSource(url);

    // 监听 device_connected 事件
    eventSource.addEventListener("device_connected", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        handlers.onDeviceConnected?.(data);
      } catch (error) {
        console.error("Failed to parse device_connected event:", error);
      }
    });

    // 监听 device_disconnected 事件
    eventSource.addEventListener("device_disconnected", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        handlers.onDeviceDisconnected?.(data);
      } catch (error) {
        console.error("Failed to parse device_disconnected event:", error);
      }
    });

    // 监听 user_message 事件
    eventSource.addEventListener("user_message", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        handlers.onUserMessage?.(data);
      } catch (error) {
        console.error("Failed to parse user_message event:", error);
      }
    });

    // 监听 assistant_message 事件
    eventSource.addEventListener("assistant_message", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        handlers.onAssistantMessage?.(data);
      } catch (error) {
        console.error("Failed to parse assistant_message event:", error);
      }
    });

    // 监听错误事件
    eventSource.onerror = (error: Event) => {
      handlers.onError?.(error);
    };

    return eventSource;
  },
};
