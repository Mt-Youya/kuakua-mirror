import React, { useState, useRef, useEffect } from "react"
import { ArrowLeft, Send, Sparkles, Heart, Mic, MicOff, RefreshCw } from "lucide-react"
import { UserProfile, ChatMessage, Moment, Theme } from "../types"
import { PERSONAS } from "../data/personas"
import { virtualChat } from "../lib/virtualData"
import { CrisisModal } from "./CrisisModal"
import { Typewriter } from "./Typewriter"
import { useAppUiStore } from "../store/useAppUiStore"

interface ChatModalProps {
  user: UserProfile
  moments: Moment[]
  themes: Theme[]
  onSaveMoment: (newMoment: Partial<Moment>) => void
  onRemoveMoment: (criteria: { content: string; response: string }) => void
}

export const ChatModal: React.FC<ChatModalProps> = ({
  user,
  moments,
  onSaveMoment,
  onRemoveMoment,
}) => {
  const { isChatOpen: isOpen, setIsChatOpen } = useAppUiStore()
  const onClose = () => setIsChatOpen(false)
  const currentPersona = PERSONAS.find((p) => p.id === user.personaId) || PERSONAS[0]
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCrisisOpen, setIsCrisisOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  // 已被用户点爱心喜欢（沉淀为夸夸记录）的消息
  const [savedMsgIds, setSavedMsgIds] = useState<Record<string, boolean>>({})

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize initial greeting referencing real past memories (PRD 7.1)
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const recentMoment = moments[0]
      let personalizedGreeting = `🤍 今天怎么样？有什么事在心里绕着吗？`

      if (recentMoment) {
        if (recentMoment.content.includes("开会") || recentMoment.content.includes("举手")) {
          personalizedGreeting = `🤍 上次你说周会上举了手虽然手在抖。那次发言后来方案推进得还顺利吗？今天有什么想聊聊的？`
        } else if (recentMoment.content.includes("拒绝")) {
          personalizedGreeting = `🤍 上周你说拒绝了那个周末局，终于把时间留给了自己。这两天过得感觉轻盈一点了吗？`
        } else {
          personalizedGreeting = `🤍 嗨，我一直在身边。最近关于「${user.innerConcernTags[0] || "内耗"}」，心里有什么小疙瘩想说说吗？`
        }
      }

      setMessages([
        {
          id: "greeting_msg",
          role: "ai",
          content: personalizedGreeting,
          turnIndex: 0,
          timestamp: "刚刚",
        },
      ])
    }
  }, [isOpen])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  if (!isOpen) return null

  // Prompt suggestions for quick testing & demo
  const samplePrompts = [
    "今天开会被批评了，回来一直在想是不是我根本不行…",
    "跟朋友聚餐又答应了不想去的活动，好讨厌自己不敢拒绝…",
    "我今天写完了一个模块，但总觉得做得很粗糙不敢发出来…",
    "今天主动给主管同步了进度，虽然很紧张但做到了！",
  ]

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputValue).trim()
    if (!textToSend || isLoading) return

    setInputValue("")

    const newTurnIndex = messages.filter((m) => m.role === "user").length + 1

    // 1. Add user message
    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: "user",
      content: textToSend,
      turnIndex: newTurnIndex,
      timestamp: "刚刚",
    }

    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      // 虚拟数据引擎：本地关键词匹配（无后端、无网络依赖）
      const data = virtualChat(textToSend)

      if (data.safetyTriggered) {
        setIsCrisisOpen(true)
      }

      let aiText = data.response || "我一直在这里听着你，你的每一步尝试都真实有据。"

      // Soft closure indicator on turn 4-5 (PRD 7.1)
      if (newTurnIndex >= 4) {
        aiText += "\n\n（我一直在你身边，随时来跟我说话，今天无论聊多久都可以。）"
      }

      const aiMsg: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        role: "ai",
        content: aiText,
        turnIndex: newTurnIndex,
        safetyFlagged: data.safetyTriggered,
        timestamp: "刚刚",
      }

      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      console.error(err)
      // Fallback
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_ai_${Date.now()}`,
          role: "ai",
          content:
            "被批评或感到内耗确实很难受。但你今天愿意直接把这件事讲出来，本身就说明你没有选择躲开它。你比自己想象的要更有韧性。",
          turnIndex: newTurnIndex,
          timestamp: "刚刚",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // 喜欢/取消喜欢一条 AI 夸夸：喜欢即沉淀为夸夸记录（支持 #话题），取消即移除
  const handleLikeMessage = (aiMsg: ChatMessage) => {
    const msgIndex = messages.findIndex((m) => m.id === aiMsg.id)
    const precedingUserMsg = messages
      .slice(0, msgIndex)
      .reverse()
      .find((m) => m.role === "user")
    if (!precedingUserMsg) return

    if (savedMsgIds[aiMsg.id]) {
      onRemoveMoment({ content: precedingUserMsg.content, response: aiMsg.content })
      setSavedMsgIds((prev) => ({ ...prev, [aiMsg.id]: false }))
    } else {
      const tagMatch = precedingUserMsg.content.match(/#([^\s#]+)/)
      onSaveMoment({
        kind: "conversation",
        content: precedingUserMsg.content,
        response: aiMsg.content,
        themeTitle: tagMatch ? tagMatch[1] : undefined,
        source: "chat",
        liked: true,
        createdAt: "刚刚",
      })
      setSavedMsgIds((prev) => ({ ...prev, [aiMsg.id]: true }))
    }
  }

  // Mock voice input toggle
  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true)
      setTimeout(() => {
        setInputValue("今天下午在组里开会，我主动提出了一个修改意见，虽然有点紧张…")
        setIsRecording(false)
      }, 1500)
    } else {
      setIsRecording(false)
    }
  }

  return (
    <div className="h5-fullscreen z-40 bg-[#F8F9FC] flex flex-col animate-fade-in shadow-2xl">
      {/* Top bar：背景延伸至顶部与状态栏无缝衔接；普通流内不遮挡内容 */}
      <div className="px-4 py-3 glass-header flex items-center justify-between">
        <button
          id="chat-back-btn"
          onClick={onClose}
          className="p-1.5 -ml-1.5 rounded-full text-stone-600 hover:bg-white/80 transition-colors flex items-center gap-1 text-xs font-medium"
        >
          <ArrowLeft size={18} />
          <span>此刻</span>
        </button>

        <div className="text-center flex items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/80 shadow-sm shrink-0">
            <img
              src="./user_p1.png"
              alt={currentPersona.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xs font-semibold text-stone-900">{currentPersona.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </div>
            <p className="text-[10px] text-stone-400">“想成为的你”正在倾听</p>
          </div>
        </div>

        <div className="w-12 flex justify-end">
          <button
            onClick={() => setMessages([])}
            title="重新开启对话"
            className="p-1 text-stone-400 hover:text-stone-600 rounded-full"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Messages thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-hero-glow">
        {messages.map((msg, index) => {
          const isAI = msg.role === "ai"

          return (
            <div key={msg.id} className={`flex flex-col ${isAI ? "items-start" : "items-end"} animate-fade-in`}>
              <div
                className={`max-w-[85%] rounded-3xl p-4 transition-all ${
                  isAI
                    ? "glass-card-strong text-stone-800 rounded-tl-sm"
                    : "bg-gradient-to-r from-[#FF7A50] to-[#FA6400] text-white shadow-md shadow-[#FF7A50]/20 rounded-tr-sm"
                }`}
              >
                {isAI && (
                  <div className="flex items-center gap-1.5 text-[10px] text-[#78649E] font-medium mb-1.5">
                    <Sparkles size={11} className="text-[#FF7A50]" />
                    <span>{currentPersona.name}</span>
                  </div>
                )}

                {isAI ? (
                  <Typewriter
                    key={msg.id}
                    text={msg.content}
                    speed={16}
                    className="text-xs leading-relaxed whitespace-pre-wrap font-serif-sc text-stone-800"
                  />
                ) : (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap font-normal">{msg.content}</p>
                )}

                {/* Inline like button on AI message（喜欢即沉淀为夸夸记录） */}
                {isAI && index > 0 && !msg.safetyFlagged && (
                  <div className="mt-3 pt-2.5 border-t border-stone-200/50 flex items-center justify-between">
                    <span className="text-[10px] text-stone-400">
                      {savedMsgIds[msg.id] ? "✓ 已喜欢这份夸夸" : "喜欢这份夸夸吗？"}
                    </span>
                    <button
                      id={`like-moment-btn-${msg.id}`}
                      onClick={() => handleLikeMessage(msg)}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-medium flex items-center gap-1 transition-all shadow-2xs ${
                        savedMsgIds[msg.id]
                          ? "bg-rose-50 text-rose-500"
                          : "glass-card-subtle text-[#FF7A50] hover:text-[#FA6400]"
                      }`}
                    >
                      <Heart size={11} className={savedMsgIds[msg.id] ? "fill-rose-500 text-rose-500" : ""} />
                      <span>{savedMsgIds[msg.id] ? "已喜欢" : "喜欢"}</span>
                    </button>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-stone-400 px-1 mt-1">{msg.timestamp}</span>
            </div>
          )
        })}

        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="glass-card rounded-3xl p-3.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF7A50] animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-[#C8B8D9] animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-[#9CD9C9] animate-bounce [animation-delay:0.4s]"></span>
              <span className="text-[11px] text-stone-500 font-serif-sc ml-1">正在为你整理温柔的回应…</span>
            </div>
          </div>
        )}

        {/* Quick prompt pills for demo / ease of use */}
        {messages.length <= 3 && !isLoading && (
          <div className="pt-2">
            <p className="text-[11px] text-stone-400 mb-2 px-1">你可以试试这样倾诉：</p>
            <div className="flex flex-col gap-1.5">
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="text-left text-xs p-2.5 rounded-2xl glass-card-subtle text-stone-700 hover:text-stone-900 transition-all flex items-center justify-between group"
                >
                  <span className="truncate pr-2">“{prompt}”</span>
                  <span className="text-[10px] text-[#FF7A50] opacity-0 group-hover:opacity-100 shrink-0">
                    点击发送 →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-3 pt-3 pb-safe glass-header">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
          className="flex items-center gap-2"
        >
          {/* Microphone speech simulation button */}
          <button
            type="button"
            onClick={toggleRecording}
            title="语音输入（模拟语音转写）"
            className={`p-2.5 rounded-full transition-all border shadow-2xs ${
              isRecording
                ? "bg-rose-500 text-white animate-pulse border-transparent"
                : "glass-card-subtle text-stone-600 hover:text-stone-800"
            }`}
          >
            {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              id="chat-input-field"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isRecording ? "正在倾听转写…" : "把心里绕着的那件事说出来…"}
              className="w-full text-xs px-3.5 py-2.5 rounded-full glass-card-subtle text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#C8B8D9] focus:bg-white transition-all shadow-2xs"
            />
          </div>

          {/* Send Button */}
          <button
            id="chat-send-btn"
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="p-2.5 rounded-full bg-[#FF7A50] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FA6400] transition-colors shadow-2xs shadow-[#FF7A50]/30"
          >
            <Send size={15} />
          </button>
        </form>
      </div>

      {/* Modals */}
      <CrisisModal isOpen={isCrisisOpen} onClose={() => setIsCrisisOpen(false)} />
    </div>
  )
}
