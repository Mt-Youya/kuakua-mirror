// API 服务封装
// 后端 API 基础地址配置
const API_BASE_URL = __DEV__
  ? 'http://localhost:8080' // 开发环境
  : 'https://your-production-url.railway.app'; // 生产环境（Railway 部署后替换）

// API 响应包装类型
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// 创建会话响应
export interface CreateConversationResponse {
  sessionId: string;
  momentId: number;
  userId: number;
}

// 消息 DTO
export interface MessageDto {
  id: number;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

// 发送消息响应
export interface SendMessageResponse {
  userMessage: MessageDto;
  assistantMessage: MessageDto;
}

/**
 * 创建新会话
 */
export async function createConversation(): Promise<string> {
  try {
    // 使用随机 momentId（实际应用中应该从用户输入或业务逻辑获取）
    const momentId = Math.floor(Math.random() * 1000000) + 1;

    const response = await fetch(`${API_BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ momentId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<CreateConversationResponse> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.message || '创建会话失败');
    }

    return result.data.sessionId;
  } catch (error) {
    console.error('创建会话失败:', error);
    throw error;
  }
}

/**
 * 发送消息并获取 AI 回复
 */
export async function sendMessage(
  sessionId: string,
  content: string
): Promise<SendMessageResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/conversations/${sessionId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<SendMessageResponse> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.message || '发送消息失败');
    }

    return result.data;
  } catch (error) {
    console.error('发送消息失败:', error);
    throw error;
  }
}

/**
 * 获取历史消息
 */
export async function getMessages(
  sessionId: string,
  limit: number = 20
): Promise<MessageDto[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/conversations/${sessionId}/messages?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<MessageDto[]> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.message || '获取消息失败');
    }

    return result.data;
  } catch (error) {
    console.error('获取消息失败:', error);
    throw error;
  }
}
