import React, { useMemo } from "react"
import { X, Sparkles, Sprout } from "lucide-react"
import { Theme, Moment } from "../types"
import { CompanionDialog } from "./ui/CompanionDialog"

interface MyTracesModalProps {
  isOpen: boolean
  onClose: () => void
  theme: Theme
  moments: Moment[]
}

// 时间排序值：'8/26' → 826；'刚刚' / '今天' / 无日期 → 9999（最新）
function traceTimeValue(createdAt: string): number {
  const match = createdAt.match(/(\d{1,2})\/(\d{1,2})/)
  if (match) return parseInt(match[1], 10) * 100 + parseInt(match[2], 10)
  return 9999
}

export const MyTracesModal: React.FC<MyTracesModalProps> = ({ isOpen, onClose, theme, moments }) => {
  const traces = useMemo(() => {
    const related = moments.filter((m) => m.themeId === theme.id || m.themeTitle === theme.name)
    const first = related.find((m) => m.isFirstPraise) || null
    const userQuotes = related
      .filter((m) => !m.isFirstPraise && m.kind !== "hardware")
      .sort((a, b) => traceTimeValue(b.createdAt) - traceTimeValue(a.createdAt))
    const praises = related
      .filter((m) => m.kind === "hardware")
      .sort((a, b) => traceTimeValue(b.createdAt) - traceTimeValue(a.createdAt))
    return { first, userQuotes, praises }
  }, [moments, theme])

  if (!isOpen) return null

  const hasAny = traces.first || traces.userQuotes.length > 0 || traces.praises.length > 0

  return (
    <CompanionDialog isOpen={isOpen} onClose={onClose} label="我的痕迹">
      <div className="glass-modal rounded-3xl max-w-sm w-full text-stone-800 max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/90 flex items-center justify-between glass-header">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
            <span>🌱 我的痕迹</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full glass-card-subtle text-[#78649E] font-medium">
              {theme.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!hasAny ? (
            <div className="p-6 text-center glass-card rounded-3xl">
              <p className="text-xs text-stone-500 font-serif-sc leading-relaxed">
                我还没在这条路上留下痕迹。不急，路一直在。
              </p>
            </div>
          ) : (
            <>
              {/* 首条原话：置顶展示 */}
              {traces.first && (
                <div className="rounded-2xl p-3.5 bg-emerald-50/90 border border-emerald-200/80 space-y-1.5">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                    <Sprout size={12} />
                    <span>🌱 初次相遇时你说过</span>
                  </div>
                  <p className="text-xs text-stone-800 font-serif-sc leading-relaxed">“{traces.first.content}”</p>
                  <span className="text-[10px] text-emerald-600/80">{traces.first.createdAt}</span>
                </div>
              )}

              {/* 用户原话：对话内容 + 里程碑体会 */}
              {traces.userQuotes.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-xs font-bold text-stone-700">✍️ 用户原话</span>
                    <span className="text-[10px] text-stone-400">共{traces.userQuotes.length} 条</span>
                  </div>
                  {traces.userQuotes.map((m) => (
                    <div key={m.id} className="p-3 rounded-2xl bg-stone-100/80 border border-stone-200/70 space-y-1">
                      <p className="text-xs text-stone-700 leading-relaxed font-serif-sc">“{m.content}”</p>
                      <div className="flex items-center justify-between text-[10px] text-stone-400">
                        <span>{m.kind === "milestone" ? "里程碑体会" : "对话原话"}</span>
                        <span>{m.createdAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 夸夸记录：系统 / 硬件生成的夸夸 */}
              {traces.praises.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-xs font-bold text-stone-700">💬 夸夸记录</span>
                    <span className="text-[10px] text-stone-400">共{traces.praises.length} 条</span>
                  </div>
                  {traces.praises.map((m) => (
                    <div key={m.id} className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200/80 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                        <Sparkles size={11} />
                        <span>夸夸镜送你的肯定</span>
                      </div>
                      <p className="text-xs text-stone-700 leading-relaxed font-serif-sc">{m.response}</p>
                      <span className="text-[10px] text-amber-700/70">{m.createdAt}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/80 glass-header">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer"
          >
            我知道了
          </button>
        </div>
      </div>
    </CompanionDialog>
  )
}
