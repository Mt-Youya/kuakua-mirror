import React from "react"
import { ShieldAlert, PhoneCall, HeartHandshake, X } from "lucide-react"
import { CompanionDialog } from "./ui/CompanionDialog"

interface CrisisModalProps {
  isOpen: boolean
  onClose: () => void
}

export const CrisisModal: React.FC<CrisisModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <CompanionDialog isOpen={isOpen} onClose={onClose} label="危机干预" dismissible={false}>
      <div className="glass-modal rounded-3xl p-6 max-w-sm w-full text-stone-800">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-2xl glass-card-subtle text-rose-600 flex items-center justify-center">
            <HeartHandshake size={22} />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-white/80 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <h3 className="text-lg font-bold text-stone-900 mb-2">你不需要一个人扛着这些</h3>

        <p className="text-sm text-stone-600 leading-relaxed mb-5">
          我听到了你现在的痛苦与疲惫。这一刻请先允许自己停下来深呼吸。夸夸镜永远在乎你的安全与健康，当痛苦难以承受时，请寻求专业温柔的心理力量陪伴你。
        </p>

        <div className="space-y-3 mb-6">
          <div className="p-3.5 rounded-2xl glass-card-subtle">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-rose-950">全国免费心理援助热线</p>
                <p className="text-base font-bold text-rose-600 font-mono tracking-wide mt-0.5">400-161-9995</p>
              </div>
              <a
                href="tel:4001619995"
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-medium flex items-center gap-1 hover:bg-rose-700 transition-colors shadow-2xs"
              >
                <PhoneCall size={12} />
                <span>立即拨打</span>
              </a>
            </div>
            <p className="text-[11px] text-rose-700/80 mt-1">24小时免费 · 温暖专业守护</p>
          </div>

          <div className="p-3.5 rounded-2xl glass-card-subtle">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-stone-800">希望24小时热线</p>
                <p className="text-sm font-bold text-stone-700 font-mono tracking-wide mt-0.5">400-161-9995</p>
              </div>
              <span className="text-[10px] text-stone-400">生命热线</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors shadow-2xs"
        >
          我已知晓，回到安全界面
        </button>
      </div>
    </CompanionDialog>
  )
}
