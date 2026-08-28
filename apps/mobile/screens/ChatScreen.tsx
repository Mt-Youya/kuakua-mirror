import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createConversation, sendMessage, getMessages, MessageDto } from '../services/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // 组件加载时初始化会话并加载历史消息
  useEffect(() => {
    initializeSession();
  }, []);

  /**
   * 初始化会话
   */
  const initializeSession = async () => {
    setIsLoading(true);
    try {
      // 创建新会话
      const newSessionId = await createConversation();
      setSessionId(newSessionId);
      console.log('会话创建成功:', newSessionId);

      // 加载历史消息
      await loadMessages(newSessionId);
    } catch (error) {
      console.error('初始化会话失败:', error);
      Alert.alert('错误', '初始化会话失败，请检查网络连接');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 加载历史消息
   */
  const loadMessages = async (sid: string) => {
    try {
      const messageDtos = await getMessages(sid);

      // 转换为本地消息格式
      const loadedMessages: Message[] = messageDtos.map((dto) => ({
        id: dto.id.toString(),
        text: dto.content,
        sender: dto.role === 'USER' ? 'user' : 'bot',
        timestamp: new Date(dto.createdAt).getTime(),
      }));

      // 倒序（API 返回的是倒序，我们需要正序显示）
      loadedMessages.reverse();

      setMessages(loadedMessages);

      // 滚动到最新消息
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error('加载历史消息失败:', error);
      // 失败不阻断使用，用户可以继续发送新消息
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  /**
   * 发送消息
   */
  const handleSend = async () => {
    if (!inputText.trim() || !sessionId || isSending) {
      return;
    }

    const userMessageText = inputText.trim();
    setInputText('');
    setIsSending(true);

    // 立即显示用户消息
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      text: userMessageText,
      sender: 'user',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);

    // 滚动到最新消息
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // 调用 API 发送消息
      const response = await sendMessage(sessionId, userMessageText);

      // 移除临时消息，添加真实消息（用户消息和 AI 回复）
      setMessages((prev) => {
        // 移除临时消息
        const filtered = prev.filter((m) => m.id !== tempUserMessage.id);

        // 添加真实的用户消息和 AI 回复
        const realUserMessage: Message = {
          id: response.userMessage.id.toString(),
          text: response.userMessage.content,
          sender: 'user',
          timestamp: new Date(response.userMessage.createdAt).getTime(),
        };

        const botMessage: Message = {
          id: response.assistantMessage.id.toString(),
          text: response.assistantMessage.content,
          sender: 'bot',
          timestamp: new Date(response.assistantMessage.createdAt).getTime(),
        };

        return [...filtered, realUserMessage, botMessage];
      });

      // 滚动到最新消息
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('发送消息失败:', error);

      // 移除临时消息
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));

      Alert.alert('错误', '发送消息失败，请检查网络连接');
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === 'user' ? styles.userMessageContainer : styles.botMessageContainer,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          item.sender === 'user' ? styles.userMessage : styles.botMessage,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.sender === 'user' ? styles.userMessageText : styles.botMessageText,
          ]}
        >
          {item.text}
        </Text>
      </View>
      <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>夸夸聊天</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>初始化会话中...</Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="输入消息..."
                placeholderTextColor="#999"
                multiline
                editable={!isSending}
              />
              <TouchableOpacity
                style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.sendButtonText}>发送</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  messageList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  botMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 4,
  },
  userMessage: {
    backgroundColor: '#007AFF',
  },
  botMessage: {
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  botMessageText: {
    color: '#000000',
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
    marginHorizontal: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#999',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
