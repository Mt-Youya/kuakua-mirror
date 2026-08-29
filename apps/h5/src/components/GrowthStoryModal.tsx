import React, { useRef } from "react"
import { Sparkles, X, Share2, Download, CheckCircle2, Bookmark } from "lucide-react"
import { Theme, UserProfile } from "../types"
import { CompanionDialog } from "./ui/CompanionDialog"

interface GrowthStoryModalProps {
  isOpen: boolean
  onClose: () => void
  theme: Theme
  user: UserProfile
}

export const GrowthStoryModal: React.FC<GrowthStoryModalProps> = ({ isOpen, onClose, theme, user }) => {
  const cardRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  const handleShareOrSave = () => {
    alert("已生成专属成长长图！长按或点击可保存至相册，分享给最懂你的朋友。")
  }

  return (
    <CompanionDialog isOpen={isOpen} onClose={onClose} label="成长故事长卡">
      <div className="glass-modal rounded-3xl max-w-sm w-full text-stone-800 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Top action header */}
        <div className="px-5 py-3 border-b border-white/90 flex items-center justify-between glass-header">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
            <Sparkles size={13} className="text-[#FF7A50]" />
            <span>成长故事长卡</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-white/80 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Story Card Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" ref={cardRef}>
          <div className="rounded-3xl p-5 glass-card-strong relative overflow-hidden text-center">
            {/* Header branding */}
            <div className="inline-block px-3 py-0.5 rounded-full glass-card-subtle text-[#78649E] text-[10px] font-semibold mb-2">
              夸夸镜 · 成长见证
            </div>

            <h3 className="text-base font-bold text-stone-900 font-serif-sc mb-1">
              关于「{theme.name}」<br />
              我是如何一步步走到现在的
            </h3>
            <p className="text-[11px] text-stone-500 font-serif-sc">
              记录者：{user.nickname} · 理想目标：{user.idealSelf}
            </p>

            {/* Starting point */}
            <div className="my-4 p-3 rounded-2xl glass-card-subtle text-left">
              <span className="text-[10px] font-bold text-[#FF7A50] uppercase tracking-wider block mb-1">
                📍 我的起点 (7月中旬)
              </span>
              <p className="text-xs text-stone-700 italic font-serif-sc">
                “准备了整整两页的见解，但整场会议一句话没敢说，结束后自责了很久…”
              </p>
            </div>

            {/* Journey steps */}
            <div className="space-y-2.5 text-left my-4">
              <div className="p-2.5 rounded-2xl glass-card-subtle flex items-start gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-stone-800">M1 · 觉察与呼吸</p>
                  <p className="text-[11px] text-stone-500">“学会了在心慌时允许自己先深呼吸三次，不再硬压情绪。”</p>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl glass-card-subtle flex items-start gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-stone-800">M2 · 准备安全跳板</p>
                  <p className="text-[11px] text-stone-500">“把想说的话写在便签上放键盘边，那一刻有了依靠。”</p>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl glass-card-subtle flex items-start gap-2">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-stone-800">M3 · 安全试水发声</p>
                  <p className="text-[11px] text-stone-500">
                    “手在发抖但还是把三点建议说完了，那一刻我没有等所谓的完美。”
                  </p>
                </div>
              </div>
            </div>

            {/* What changed statement */}
            <div className="p-3.5 rounded-2xl glass-card-subtle text-left">
              <span className="text-[11px] font-bold text-[#FF7A50] block mb-1">✨ 现在我看待这件事：</span>
              <p className="text-xs text-stone-800 font-serif-sc leading-relaxed">
                “「开会发言」从前需要花 5 分的巨大力气，现在只需 3
                分了。我终于相信：带着颤音的真诚，永远比沉默更有分量。”
              </p>
            </div>

            {/* Brand footer */}
            <div className="mt-4 pt-3 border-t border-stone-200/50 flex items-center justify-between text-[9px] text-stone-400">
              <span>夸夸镜 · AI情绪支持伴侣</span>
              <span>在镜子前夸你一句，在APP里陪你说话</span>
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="p-4 border-t border-white/90 glass-header grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="py-2.5 rounded-2xl glass-card-subtle text-stone-600 text-xs font-medium hover:text-stone-900 shadow-2xs transition-colors"
          >
            返回路径
          </button>
          <button
            onClick={handleShareOrSave}
            className="py-2.5 rounded-2xl bg-[#FF7A50] text-white text-xs font-medium hover:bg-[#FA6400] flex items-center justify-center gap-1.5 shadow-sm shadow-[#FF7A50]/20"
          >
            <Download size={13} />
            <span>保存长图</span>
          </button>
        </div>
      </div>
    </CompanionDialog>
  )
}
