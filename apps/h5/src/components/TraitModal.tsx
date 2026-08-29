import React from "react"
import { X, Sparkles, Download, Share2, Heart } from "lucide-react"
import { DiscoveredTrait } from "../types"
import { CompanionDialog } from "./ui/CompanionDialog"

interface TraitModalProps {
  isOpen: boolean
  onClose: () => void
  trait: DiscoveredTrait
  mode: "share" | "detail" // share：认领后生成分享卡；detail：我发现的自己查看详情
}

export const TraitModal: React.FC<TraitModalProps> = ({ isOpen, onClose, trait, mode }) => {
  if (!isOpen) return null

  const handleSave = onClose
  const handleShare = onClose

  return (
    <CompanionDialog isOpen={isOpen} onClose={onClose} label="我发现的自己">
      {/* 干净的特质卡片（暖色背景 + 氛围光晕 + 圆角） */}
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-b from-[#FFF4F0] via-[#FBF6F4] to-[#F7F2FA] relative">
        <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-[#FF7A50]/20 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-[#C8B8D9]/25 blur-3xl pointer-events-none"></div>

        <button
          id="trait-close-btn"
          onClick={onClose}
          title="关闭"
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full text-stone-500 hover:text-stone-700 hover:bg-white/80 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        <div className="relative z-10 p-6 space-y-3">
          {/* 品牌小标 */}
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#FF7A50]" />
            <span className="text-[10px] font-semibold text-[#78649E]">✨ 我发现的自己</span>
          </div>

          {/* 特质标题 */}
          <h3 className="text-base font-bold text-stone-900 font-serif-sc leading-snug">{trait.title}</h3>

          {/* 换角度解读 */}
          <p className="text-xs text-stone-700 leading-relaxed font-serif-sc">{trait.description}</p>

          {/* 证据：历史记录引用 */}
          <div className="space-y-1.5 pt-1">
            {trait.evidence.map((ev, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl glass-card-subtle text-[11px] text-stone-600 leading-relaxed font-serif-sc"
              >
                <span className="font-semibold text-[#FF7A50] mr-1">{ev.date}</span>“{ev.quote}”
              </div>
            ))}
          </div>

          {/* 落款 */}
          <p className="text-[10px] text-stone-400 font-serif-sc pt-0.5">未来的每一次新记录，都在继续验证这一面</p>

          {/* 底部操作 */}
          <div className="flex items-center justify-center gap-2.5 pt-3">
            {mode === "share" ? (
              <>
                <button
                  id="save-trait-card-btn"
                  onClick={handleSave}
                  className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-[#FF8A65] to-[#FF7A50] text-white text-xs font-semibold shadow-md shadow-[#FF7A50]/20 hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} />
                  <span>保存长图</span>
                </button>
                <button
                  id="share-trait-card-btn"
                  onClick={handleShare}
                  className="py-2.5 px-5 rounded-2xl glass-card-subtle text-stone-700 text-xs font-medium hover:text-stone-900 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 size={13} />
                  <span>分享</span>
                </button>
              </>
            ) : (
              <button
                id="trait-detail-close-btn"
                onClick={onClose}
                className="py-2.5 px-6 rounded-2xl bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Heart size={13} className="text-[#FF8A65]" />
                <span>珍藏这一面</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </CompanionDialog>
  )
}
