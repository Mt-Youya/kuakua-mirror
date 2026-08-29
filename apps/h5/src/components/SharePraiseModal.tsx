import React from "react"
import { X, Sparkles, Download, Share2 } from "lucide-react"
import { CompanionDialog } from "./ui/CompanionDialog"

interface SharePraiseModalProps {
  isOpen: boolean
  onClose: () => void
  praise: string
  nickname: string
}

export const SharePraiseModal: React.FC<SharePraiseModalProps> = ({ isOpen, onClose, praise, nickname }) => {
  if (!isOpen) return null

  const handleSave = onClose
  const handleShare = onClose

  return (
    <CompanionDialog isOpen={isOpen} onClose={onClose} label="今日夸夸分享卡">
      {/* 干净的夸夸卡片（暖色背景 + 氛围光晕 + 圆角），卡片即分享内容本身 */}
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-b from-[#FFF4F0] via-[#FBF6F4] to-[#F7F2FA] relative">
        {/* 氛围光晕 */}
        <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-[#FF7A50]/20 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-[#C8B8D9]/25 blur-3xl pointer-events-none"></div>

        {/* 关闭 */}
        <button
          onClick={onClose}
          title="关闭返回"
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full text-stone-500 hover:text-stone-700 hover:bg-white/80 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        <div className="relative z-10 p-6 space-y-3">
          {/* 品牌小标 */}
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#FF7A50]" />
            <span className="text-[10px] font-semibold text-[#78649E]">夸夸镜 · 今日夸夸</span>
          </div>

          {/* 夸夸文案 */}
          <p className="text-sm font-bold text-stone-900 font-serif-sc leading-relaxed">“{praise}”</p>

          {/* 落款 */}
          <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1">
            <span>{nickname} 的今日夸夸</span>
            <span>在镜子前夸你一句，在 APP 里陪你说话</span>
          </div>

          {/* 底部操作：保存长图 + 分享（卡片内居中） */}
          <div className="flex items-center justify-center gap-2.5 pt-4">
            <button
              id="save-praise-card-btn"
              onClick={handleSave}
              className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-[#FF8A65] to-[#FF7A50] text-white text-xs font-semibold shadow-md shadow-[#FF7A50]/20 hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={13} />
              <span>保存长图</span>
            </button>
            <button
              id="share-praise-card-btn"
              onClick={handleShare}
              className="py-2.5 px-5 rounded-2xl glass-card-subtle text-stone-700 text-xs font-medium hover:text-stone-900 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 size={13} />
              <span>分享</span>
            </button>
          </div>

          {/* 关闭返回 */}
          <div className="flex justify-center pt-3">
            <button
              id="close-praise-card-btn"
              onClick={onClose}
              className="text-[11px] text-stone-400 hover:text-[#FF7A50] transition-colors cursor-pointer"
            >
              关闭返回
            </button>
          </div>
        </div>
      </div>
    </CompanionDialog>
  )
}
