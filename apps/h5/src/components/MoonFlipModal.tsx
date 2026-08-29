import React, { useState } from "react"
import { X, Sparkles, MoonStar, Share2, Check } from "lucide-react"
import { MoonFlipCard } from "../types"

interface MoonFlipModalProps {
  isOpen: boolean
  onClose: () => void
  cards: MoonFlipCard[] // 本月「月亮另一面」卡（最多 3 张；空数组 = 降级寄语）
  monthLabel: string // 如 '8月'
  onViewFullSummary?: () => void // 收尾屏「查看完整月度总结」入口（可选）
}

export const MoonFlipModal: React.FC<MoonFlipModalProps> = ({
  isOpen,
  onClose,
  cards,
  monthLabel,
  onViewFullSummary,
}) => {
  const [closing, setClosing] = useState(false)
  // stage: intro（开场）→ cards（翻卡）→ done（收尾寄语）
  const [stage, setStage] = useState<"intro" | "cards" | "done">("intro")
  const [index, setIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  // 分享文案已复制到剪贴板的临时反馈
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const closeWithFade = () => {
    setClosing(true)
    setTimeout(() => onClose(), 260)
  }

  const handleStart = () => {
    setStage("cards")
    setIndex(0)
    setIsFlipped(false)
  }

  const hasCards = cards.length > 0

  const handleFlip = () => {
    if (isFlipped) return
    setIsFlipped(true)
    // 移动端提供轻微触觉反馈；桌面无副作用
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(8)
    }
  }

  const handleNext = () => {
    if (index < cards.length - 1) {
      setIndex(index + 1)
      setIsFlipped(false)
    } else {
      setStage("done")
    }
  }

  // 收尾屏「查看完整月度总结」：关掉翻卡，交给上层打开原有总结弹窗
  const handleViewFullSummary = () => {
    if (!onViewFullSummary) return
    closeWithFade()
    setTimeout(onViewFullSummary, 280)
  }

  // 分享物料：优先系统分享，退回复制文案（复制成功给 2s 按钮反馈）
  const buildShareText = () => {
    const parts = cards.map(
      (c) => `▸ ${c.date} · 「${c.original}」\n  月亮翻过来，是「${c.traitTitle}」\n  ${c.reframe}`
    )
    return [
      `🌙 我的「月亮另一面」· ${monthLabel}`,
      "",
      ...parts,
      "",
      "— 夸夸镜 · 在镜子前夸你一句，在 APP 里陪你说话",
    ].join("\n")
  }

  const handleShare = async () => {
    const text = buildShareText()
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `我的月亮另一面 · ${monthLabel}`, text })
        return
      } catch (e) {
        // 用户取消系统分享：静默落到复制路径
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      // 剪贴板不可用时静默（分享为锦上添花，不影响关闭）
    }
  }

  // 当前卡
  const card = hasCards ? cards[index] : null

  return (
    <div
      className="h5-fullscreen z-50 bg-[#0B0F1E] flex flex-col animate-fade-in overflow-hidden"
      onClick={closeWithFade}
    >
      {/* 顶部：品牌 + X 关闭 */}
      <div className="relative z-10 px-5 pt-3 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C8B8D9]">
          <MoonStar size={14} />
          <span>月亮的另一面</span>
        </div>
        <button
          id="moon-flip-close-btn"
          onClick={closeWithFade}
          title="关闭"
          className="p-1.5 rounded-full text-stone-400 hover:text-stone-200 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* 简述进度：intro 显示引导；卡片阶段显示 第 x/N 张；收尾不显示 */}
      {stage === "cards" && card && (
        <div className="relative z-10 px-5 pt-2 text-center text-[10px] text-stone-500 tracking-widest">
          第 {index + 1} 张 / 共 {cards.length} 张
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-10" onClick={(e) => e.stopPropagation()}>
        {!hasCards ? (
          /* ---- 降级：本月没有可整理的记录，展示温柔寄语 ---- */
          <div className="text-center space-y-5 px-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center moon-breathe">
              <MoonStar size={26} className="text-[#C8B8D9]" />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-200 font-serif-sc leading-relaxed">
                这个月，你没有留下想要"翻转"的困扰
              </p>
              <p className="text-xs text-stone-500 font-serif-sc leading-relaxed mt-3">
                也许是因为这个月你稳稳地度过了一些时刻，
                <br />
                那些没有写下来的日子，也是月光的一部分。
              </p>
            </div>
            <button
              id="moon-flip-close-empty-btn"
              onClick={closeWithFade}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF8A65] to-[#FF7A50] text-white text-xs font-semibold shadow-md shadow-[#FF7A50]/20 hover:opacity-95 transition-all cursor-pointer"
            >
              我收到了
            </button>
          </div>
        ) : stage === "done" ? (
          /* ---- 收尾：温柔寄语 ---- */
          <div className="text-center space-y-6 px-2 animate-fade-in">
            <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-tr from-[#FF8A65]/30 to-[#C8B8D9]/30 border border-white/15 flex items-center justify-center moon-breathe">
              <Sparkles size={22} className="text-[#FFD166]" />
            </div>
            <p className="text-lg font-bold text-stone-100 font-serif-sc leading-relaxed">
              {cards.length} 个曾经让你皱眉的夜晚，
              <br />
              都藏着一个你没发现的天赋。
            </p>
            <p className="text-sm text-stone-400 font-serif-sc leading-relaxed">
              每一个月的另一面，都在等你温柔地看见。
            </p>
            <p className="text-[10px] text-stone-600 tracking-widest">— {monthLabel} · 月亮另一面 —</p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                id="moon-flip-share-btn"
                onClick={handleShare}
                className="px-5 py-2.5 rounded-2xl glass-card-subtle text-[#C8B8D9] border border-white/15 text-xs font-medium hover:text-white hover:bg-white/10 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                {copied ? <Check size={13} /> : <Share2 size={13} />}
                {copied ? "已复制分享文案" : "分享这份月光"}
              </button>
              <button
                id="moon-flip-finish-btn"
                onClick={closeWithFade}
                className="px-7 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF8A65] to-[#FF7A50] text-white text-xs font-semibold shadow-md shadow-[#FF7A50]/20 hover:opacity-95 transition-all cursor-pointer"
              >
                我收到了
              </button>
            </div>
            {onViewFullSummary && (
              <button
                id="moon-flip-view-summary-btn"
                onClick={handleViewFullSummary}
                className="text-[11px] text-stone-500 hover:text-[#C8B8D9] transition-colors cursor-pointer"
              >
                查看完整月度总结 →
              </button>
            )}
          </div>
        ) : stage === "intro" ? (
          /* ---- 开场：引导进入 ---- */
          <div className="text-center space-y-6 px-2">
            <div className="w-20 h-20 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_30%,rgba(255,255,255,0.25),transparent_55%)]"></div>
              <MoonStar size={30} className="text-[#FFD166] relative" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-100 font-serif-sc mb-2">这个月，有几件让你皱眉的事</h2>
              <p className="text-xs text-stone-400 font-serif-sc leading-relaxed">
                请翻开月亮，看看那些"不够好"
                <br />
                其实在为你挡住什么，又照亮了什么。
              </p>
            </div>
            <button
              id="moon-flip-start-btn"
              onClick={handleStart}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#FF8A65] to-[#FF7A50] text-white text-sm font-semibold shadow-lg shadow-[#FF7A50]/25 hover:opacity-95 transition-all animate-soft-pulse cursor-pointer"
            >
              开始书写
            </button>
          </div>
        ) : card ? (
          /* ---- 翻转卡阶段 ---- */
          <div
            id="moon-flip-card-stage"
            className="w-full max-w-[320px] mx-auto mt-6 moon-flip-container"
            style={{ height: 460 }}
          >
            {/* 背后的层叠卡（仅视觉装饰：缩小的暗月剪影） */}
            {cards.slice(index + 1).map((_, offset) => (
              <div
                key={`stack-${offset}`}
                className="absolute inset-0 rounded-3xl border border-white/8 bg-[#101527]/80"
                style={{
                  transform: `translateY(${(offset + 1) * -10}px) scale(${1 - (offset + 1) * 0.04})`,
                  zIndex: -1,
                }}
              ></div>
            ))}

            {/* 翻转内层 */}
            <div id="moon-flip-inner" className={`moon-flip-inner ${isFlipped ? "is-flipped" : ""}`}>
              {/* 正面：暗月 */}
              <div
                className="moon-flip-face moon-face-dark flex flex-col justify-between p-6 text-left"
                onClick={handleFlip}
              >
                {/* 正面顶：日期 + 标签 */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-stone-400 tracking-widest">{card.date}</span>
                  {card.tag && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-[#C8B8D9] border border-white/15">
                      #{card.tag}
                    </span>
                  )}
                </div>

                {/* 原话引用 */}
                <div className="space-y-3">
                  <p className="text-[11px] text-stone-500 tracking-widest">当时你记下的</p>
                  <p className="text-sm text-stone-200 font-serif-sc leading-relaxed">“{card.original}”</p>
                  {card.difficultyScore != null && card.difficultyScore > 0 && (
                    <p className="text-[10px] text-stone-500">当时这件事，你觉得难度 {card.difficultyScore} / 5</p>
                  )}
                </div>

                {/* 呼吸灯按钮 */}
                <div className="flex justify-center">
                  <button
                    id="moon-flip-flip-btn"
                    onClick={handleFlip}
                    className="px-5 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-[#FFD166] text-xs font-medium hover:bg-white/15 transition-colors animate-soft-pulse cursor-pointer"
                  >
                    点击翻开月亮的另一面
                  </button>
                </div>
              </div>

              {/* 背面：亮月 */}
              <div className="moon-flip-face moon-flip-back moon-face-bright flex flex-col justify-between p-6 text-left">
                <div className="moon-sheen"></div>

                {/* 背面顶：亮月标记 */}
                <div className="flex items-center justify-between relative">
                  <span className="text-[10px] text-[#78649E] tracking-widest">月亮翻过来了</span>
                  <span className="text-base">☀</span>
                </div>

                {/* 天赋词 + 解读 */}
                <div className="space-y-3 relative">
                  <p className="text-[11px] text-[#78649E] font-semibold tracking-widest">✨ 天赋浮现</p>
                  <h3 className="text-lg font-bold text-stone-900 font-serif-sc leading-snug">{card.traitTitle}</h3>
                  <p className="text-xs text-stone-700 leading-relaxed font-serif-sc">{card.reframe}</p>
                </div>

                {/* 下一张 / 完成 */}
                <div className="flex justify-center relative">
                  <button
                    id={index < cards.length - 1 ? "moon-flip-next-btn" : "moon-flip-finish-btn"}
                    onClick={handleNext}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF8A65] to-[#FF7A50] text-white text-xs font-semibold shadow-md shadow-[#FF7A50]/25 hover:opacity-95 transition-all cursor-pointer"
                  >
                    {index < cards.length - 1 ? "翻开下一张 →" : "我收到了"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
