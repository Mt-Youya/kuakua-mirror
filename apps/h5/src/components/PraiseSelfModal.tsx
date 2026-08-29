import React, { useState } from "react"
import { Sparkles, X, Heart, Smile, Check, Tag, HelpCircle, Mic, MicOff } from "lucide-react"
import { UserProfile, Moment, Theme } from "../types"
import { CompanionDialog } from "./ui/CompanionDialog"

interface PraiseSelfModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserProfile
  themes: Theme[]
  onSavePraise: (praiseData: {
    content: string
    difficultyScore: number
    themeId?: string
    themeTitle?: string
  }) => void
}

const PRESET_PRAISES = [
  "今天在会议交流中勇敢说出了心里的第一句话",
  "放下了对绝对完美的苛求，允许自己先完成再完善",
  "温和地拒绝了消耗自己的无效社交，保护了个人精力",
  "即使心里在打鼓、手在微微发抖，也依然迈出了那一步",
  "今天好好照顾了自己的情绪，没有苛责自己",
]

export const PraiseSelfModal: React.FC<PraiseSelfModalProps> = ({ isOpen, onClose, user, themes, onSavePraise }) => {
  const [content, setContent] = useState("")
  const [difficultyScore, setDifficultyScore] = useState<number>(3)
  const [selectedThemeId, setSelectedThemeId] = useState<string>(themes[0]?.id || "theme_display_anxiety")
  const [isRecording, setIsRecording] = useState(false)

  if (!isOpen) return null

  const handleSelectPreset = (preset: string) => {
    setContent(preset)
  }

  const handleToggleVoice = () => {
    if (!isRecording) {
      setIsRecording(true)
      setTimeout(() => {
        setContent("今天我把心里的真实想法坦白说了出来，没有在心底犹豫退缩")
        setIsRecording(false)
      }, 1400)
    } else {
      setIsRecording(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    const selectedTheme = themes.find((t) => t.id === selectedThemeId)
    onSavePraise({
      content: content.trim(),
      difficultyScore,
      themeId: selectedTheme?.id,
      themeTitle: selectedTheme?.name || "展示焦虑",
    })

    setContent("")
    onClose()
  }

  return (
    <CompanionDialog isOpen={isOpen} onClose={onClose} label="夸夸自己">
      <div className="glass-modal rounded-3xl p-6 max-w-sm w-full text-stone-800 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full glass-card-subtle text-[#FF7A50] flex items-center justify-center">
              <Sparkles size={16} className="fill-[#FF7A50]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">夸夸自己</h3>
              <p className="text-[10px] text-stone-400">看见并记录今天属于你的勇敢与进步</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-white/80 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick presets */}
          <div>
            <label className="text-[11px] font-medium text-stone-500 mb-1.5 block">快捷灵感（点击快速填入）</label>
            <div className="space-y-1.5">
              {PRESET_PRAISES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-full text-left text-xs p-2 rounded-xl border transition-all text-stone-700 flex items-center justify-between ${
                    content === preset
                      ? "glass-card-strong border-[#FF7A50] text-[#FF7A50] font-medium"
                      : "glass-card-subtle hover:bg-white/90"
                  }`}
                >
                  <span className="truncate pr-2">✨ {preset}</span>
                  {content === preset && <Check size={13} className="shrink-0 text-[#FF7A50]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Custom input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-stone-500">今天你做到了什么？</label>
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 transition-all ${
                  isRecording ? "bg-rose-500 text-white animate-pulse" : "glass-card-subtle text-stone-500"
                }`}
              >
                {isRecording ? <MicOff size={10} /> : <Mic size={10} />}
                <span>{isRecording ? "正在倾听…" : "语音输入"}</span>
              </button>
            </div>
            <div className="p-3 rounded-2xl glass-card-subtle focus-within:border-[#C8B8D9] focus-within:bg-white transition-all">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="写下你今天为自己迈出的一小步，例如：今天在会上虽然心跳很快，但还是举手说了两句"
                rows={3}
                className="w-full text-xs bg-transparent border-none focus:outline-none text-stone-800 placeholder:text-stone-400 resize-none"
              />
            </div>
          </div>

          {/* Difficulty Score */}
          <div className="p-3.5 rounded-2xl glass-card-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-800">这件事对你来说有多难？</span>
              <span className="text-xs font-bold text-[#FF7A50]">{difficultyScore} 分</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={difficultyScore}
              onChange={(e) => setDifficultyScore(Number(e.target.value))}
              className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#FF7A50]"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-1">
              <span>1 顺手做成</span>
              <span>3 有点挑战</span>
              <span>5 极其艰难</span>
            </div>
          </div>

          {/* Associated Theme Tag */}
          <div>
            <label className="text-[11px] font-medium text-stone-500 mb-1.5 block">归属内耗主题（可选）</label>
            <div className="flex flex-wrap gap-1.5">
              {themes.map((theme) => {
                const isSelected = selectedThemeId === theme.id
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedThemeId(theme.id)}
                    className={`text-[11px] px-2.5 py-1 rounded-full transition-all border shadow-2xs ${
                      isSelected
                        ? "glass-card-strong text-[#55407A] font-semibold border-[#C8B8D9]"
                        : "glass-card-subtle text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {theme.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 rounded-2xl glass-card-subtle text-stone-600 text-xs font-medium hover:text-stone-900 shadow-2xs transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!content.trim()}
              className="py-2.5 rounded-2xl bg-gradient-to-r from-[#FF8A65] to-[#FF7A50] text-white text-xs font-semibold shadow-md shadow-[#FF7A50]/20 hover:opacity-95 transition-all disabled:opacity-50 disabled:shadow-none"
            >
              ✨ 记录并夸夸自己
            </button>
          </div>
        </form>
      </div>
    </CompanionDialog>
  )
}
