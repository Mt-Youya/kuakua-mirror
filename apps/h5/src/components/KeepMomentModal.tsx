import React, { useState } from "react"
import { Bookmark, Sparkles, Check, X, Tag } from "lucide-react"
import { Moment, Theme } from "../types"
import { CompanionDialog } from "./ui/CompanionDialog"

interface KeepMomentModalProps {
  isOpen: boolean
  onClose: () => void
  userQuote: string
  aiResponse: string
  themes: Theme[]
  onSaveMoment: (newMoment: Partial<Moment>) => void
}

export const KeepMomentModal: React.FC<KeepMomentModalProps> = ({
  isOpen,
  onClose,
  userQuote,
  aiResponse,
  themes,
  onSaveMoment,
}) => {
  const [editedQuote, setEditedQuote] = useState(userQuote)
  const [difficultyScore, setDifficultyScore] = useState<number | undefined>(3)
  const [selectedThemeId, setSelectedThemeId] = useState<string>(themes[0]?.id || "")
  const [isSkippedScore, setIsSkippedScore] = useState<boolean>(false)

  // Sync state if userQuote changes
  React.useEffect(() => {
    setEditedQuote(userQuote)
  }, [userQuote])

  if (!isOpen) return null

  const handleSave = () => {
    const matchedTheme = themes.find((t) => t.id === selectedThemeId)
    onSaveMoment({
      kind: "conversation",
      content: editedQuote.trim() || userQuote,
      response: aiResponse,
      difficultyScore: isSkippedScore ? undefined : difficultyScore,
      themeId: selectedThemeId || undefined,
      themeTitle: matchedTheme ? matchedTheme.name : undefined,
      source: "chat",
      liked: true,
      createdAt: "刚刚",
    })
    onClose()
  }

  return (
    <CompanionDialog isOpen={isOpen} onClose={onClose} label="留下这一段">
      <div className="glass-modal rounded-3xl p-6 max-w-sm w-full text-stone-800 relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full glass-card-subtle text-[#FF7A50] flex items-center justify-center">
              <Bookmark size={16} />
            </div>
            <h3 className="text-base font-bold text-stone-900">留下这一段</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-white/80 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-stone-400 mb-4">这句话将沉淀在此刻卡片与成长回顾中，成为未来见证改变的真实证据。</p>

        {/* User quote box (editable) */}
        <div className="mb-3.5">
          <label className="text-[11px] font-medium text-stone-500 mb-1 block">你当时说的话</label>
          <div className="p-3 rounded-2xl glass-card-subtle focus-within:border-[#C8B8D9] focus-within:bg-white transition-all">
            <textarea
              value={editedQuote}
              onChange={(e) => setEditedQuote(e.target.value)}
              rows={2}
              className="w-full text-xs text-stone-800 bg-transparent resize-none focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* AI response snippet */}
        <div className="mb-4 p-3 rounded-2xl glass-card-subtle">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#78649E] mb-1">
            <Sparkles size={12} className="text-[#FF7A50]" />
            <span>AI 陪伴回应</span>
          </div>
          <p className="text-xs text-stone-700 leading-relaxed font-serif-sc">{aiResponse}</p>
        </div>

        {/* Difficulty score 1-5 with skip option (PRD Section 4.3) */}
        <div className="mb-4 p-3.5 rounded-2xl glass-card-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-800">这件事对你来说有多难？</span>
            <button
              onClick={() => setIsSkippedScore(!isSkippedScore)}
              className="text-[11px] text-stone-400 hover:text-stone-600 underline"
            >
              {isSkippedScore ? "恢复打分" : "跳过此项"}
            </button>
          </div>

          {!isSkippedScore ? (
            <div>
              <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1 px-1">
                <span>一点点 (1分)</span>
                <span className="text-xs font-bold text-[#FF7A50] px-2 py-0.5 rounded-md bg-white border border-white/90 shadow-2xs">
                  {difficultyScore} 分
                </span>
                <span>非常难 (5分)</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={difficultyScore || 3}
                onChange={(e) => setDifficultyScore(Number(e.target.value))}
                className="w-full accent-[#FF7A50] cursor-pointer h-1.5 bg-stone-200 rounded-lg"
              />
              <p className="text-[10px] text-stone-400 mt-1.5 text-center">
                难度分是回顾成长曲线的唯一依据，纯属你自己的主观感受
              </p>
            </div>
          ) : (
            <p className="text-xs text-stone-400 italic text-center py-1">已跳过难度打分（不影响沉淀记录）</p>
          )}
        </div>

        {/* Associate theme tag */}
        <div className="mb-5">
          <label className="text-[11px] font-medium text-stone-500 mb-1.5 flex items-center gap-1">
            <Tag size={12} />
            <span>关联内耗主题（可选）</span>
          </label>
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
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={onClose}
            className="py-2.5 rounded-2xl glass-card-subtle text-stone-600 text-xs font-medium hover:text-stone-900 shadow-2xs transition-colors"
          >
            跳过不留
          </button>
          <button
            id="confirm-keep-moment-btn"
            onClick={handleSave}
            className="py-2.5 rounded-2xl bg-gradient-to-r from-[#FF8A65] to-[#FF7A50] text-white text-xs font-semibold shadow-md shadow-[#FF7A50]/20 hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Check size={14} />
            <span>确认留下</span>
          </button>
        </div>
      </div>
    </CompanionDialog>
  )
}
