import React, { useState } from "react"
import {
  Sparkles,
  X,
  Check,
  Star,
  Camera,
  Upload,
  ArrowRight,
  PauseCircle,
  HelpCircle,
  FileText,
  RefreshCw,
} from "lucide-react"
import confetti from "canvas-confetti"
import { Milestone, UserProfile } from "../types"
import { CompanionDialog } from "./ui/CompanionDialog"

interface MilestoneModalProps {
  isOpen: boolean
  onClose: () => void
  milestone: Milestone | null
  themeTitle: string
  user: UserProfile
  onCompleteMilestone: (
    milestoneId: string,
    evidenceText: string,
    evidencePhoto?: string,
    difficultyScore?: number
  ) => Promise<string>
  onPauseMilestone: (milestoneId: string) => void
  onResumeMilestone: (milestoneId: string) => void
}

export const MilestoneModal: React.FC<MilestoneModalProps> = ({
  isOpen,
  onClose,
  milestone,
  themeTitle,
  user,
  onCompleteMilestone,
  onPauseMilestone,
  onResumeMilestone,
}) => {
  const [evidenceText, setEvidenceText] = useState("")
  const [evidencePhoto, setEvidencePhoto] = useState<string | undefined>()
  const [difficultyScore, setDifficultyScore] = useState<number>(3)
  const [isScoreSkipped, setIsScoreSkipped] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [aiCompletionResponse, setAiCompletionResponse] = useState<string | null>(null)
  const [completedSuccess, setCompletedSuccess] = useState(false)

  // Sample photo options for demo evidence
  const sampleEvidencePhotos = [
    "https://images.unsplash.com/photo-1517842645767-c639042777db?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500&auto=format&fit=crop&q=80",
  ]

  if (!isOpen || !milestone) return null

  const handleCompleteSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Trigger canvas confetti celebration
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#FF7A50", "#C8B8D9", "#9CD9C9", "#FFD166"],
      })

      const responseText = await onCompleteMilestone(
        milestone.id,
        evidenceText.trim() || "我完成了这个练习",
        evidencePhoto,
        isScoreSkipped ? undefined : difficultyScore
      )

      setAiCompletionResponse(responseText)
      setCompletedSuccess(true)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePause = () => {
    onPauseMilestone(milestone.id)
    onClose()
  }

  return (
    <CompanionDialog isOpen={isOpen} onClose={onClose} label="里程碑记录">
      <div className="glass-modal rounded-3xl p-6 max-w-sm w-full text-stone-800 max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full glass-card-subtle text-[#78649E] font-semibold">
              {themeTitle}
            </span>
            <span className="text-xs text-stone-400 font-medium">{milestone.title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-white/80 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {!completedSuccess ? (
          <div>
            <h3 className="text-base font-bold text-stone-900 mb-1">{milestone.description}</h3>

            {/* Guiding question (PRD Section 4.4: 引导问题先于任务) */}
            <div className="my-3.5 p-3.5 rounded-2xl glass-card-subtle">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#FF7A50] mb-1">
                <HelpCircle size={13} />
                <span>引导思考：</span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed font-serif-sc">{milestone.guidingQuestion}</p>
            </div>

            {/* Task prompt */}
            <div className="mb-4 p-3 rounded-2xl glass-card-subtle">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 mb-1">
                <FileText size={12} />
                <span>微小行动任务：</span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed">{milestone.taskDescription}</p>
            </div>

            {/* Write down experience */}
            <div className="mb-3.5">
              <label className="text-[11px] font-medium text-stone-600 mb-1 block">
                写下你的体会或过程（生成专属回应的依据）：
              </label>
              <textarea
                value={evidenceText}
                onChange={(e) => setEvidenceText(e.target.value)}
                placeholder="例如：今天在小组里主动分享了便利贴上的第一句话，心跳虽然快但说出来了…"
                rows={3}
                className="w-full text-xs p-3 rounded-2xl glass-card-subtle focus:bg-white focus:outline-none focus:ring-2 ring-[#C8B8D9] transition-all resize-none"
              />
            </div>

            {/* Optional evidence photo (non-facial, PRD 1.3) */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-stone-600">附一张纪念照片（选填，仅作展示）：</span>
                {evidencePhoto && (
                  <button
                    onClick={() => setEvidencePhoto(undefined)}
                    className="text-[10px] text-rose-500 hover:underline"
                  >
                    移除照片
                  </button>
                )}
              </div>

              {!evidencePhoto ? (
                <div className="flex gap-2">
                  {sampleEvidencePhotos.map((photo, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setEvidencePhoto(photo)}
                      className="text-[11px] flex-1 py-2 px-2.5 rounded-xl border border-dashed border-stone-300 hover:border-[#FF7A50] text-stone-500 hover:text-stone-800 flex items-center justify-center gap-1 transition-all glass-card-subtle"
                    >
                      <Camera size={12} />
                      <span>{i === 0 ? "选便利贴照" : "选笔记本照"}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden max-h-28 border border-white/90 shadow-2xs">
                  <img src={evidencePhoto} alt="证据预览" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Difficulty slider（可跳过 · 纯属主观感受 · 与平台一致） */}
            <div className="mb-5 p-3 rounded-2xl glass-card-subtle">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-stone-700">这件事做起来有多难？</span>
                <button
                  onClick={() => setIsScoreSkipped(!isScoreSkipped)}
                  className="text-[11px] text-stone-400 hover:text-stone-600 underline"
                >
                  {isScoreSkipped ? "恢复打分" : "跳过此项"}
                </button>
              </div>

              {!isScoreSkipped ? (
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
                    value={difficultyScore}
                    onChange={(e) => setDifficultyScore(Number(e.target.value))}
                    className="w-full accent-[#FF7A50] cursor-pointer h-1.5 bg-stone-200 rounded-lg"
                  />
                  <p className="text-[10px] text-stone-400 mt-1.5 text-center">
                    难度分是回顾成长曲线的依据，纯属你自己的主观感受
                  </p>
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic text-center py-1.5">已跳过难度打分（不影响里程碑完成）</p>
              )}
            </div>

            {/* Main Submit Action（已暂停时显示「继续这项」） */}
            {milestone.status === "paused" ? (
              <button
                id="milestone-resume-btn"
                onClick={() => {
                  onResumeMilestone(milestone.id)
                  onClose()
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF7A50] to-[#FA6400] text-white text-xs font-semibold shadow-md shadow-[#FF7A50]/25 hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={14} />
                <span>继续这项（回到进行中）</span>
              </button>
            ) : (
              <button
                id="milestone-i-did-it-btn"
                onClick={handleCompleteSubmit}
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF7A50] to-[#FA6400] text-white text-xs font-semibold shadow-md shadow-[#FF7A50]/25 hover:opacity-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Star size={14} className="fill-white" />
                <span>{isSubmitting ? "正在整理专属看见…" : "我做到了（完成本里程碑）"}</span>
              </button>
            )}

            {/* Graceful Pause / Alternative Path (PRD 4.4: 失败路径支持) */}
            {milestone.status !== "paused" && (
              <div className="mt-3 pt-2.5 border-t border-stone-200/50 flex items-center justify-between text-[11px] text-stone-400">
                <span>觉得这一步有点难？</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePause}
                    className="hover:text-stone-700 text-stone-500 font-medium transition-colors"
                  >
                    先放一放
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Completion Success View */
          <div className="text-center py-2 animate-fade-in">
            <div className="w-12 h-12 rounded-full glass-card-subtle text-[#FFD166] mx-auto flex items-center justify-center mb-3 shadow-sm shadow-[#FFD166]/30">
              <Star size={24} className="fill-[#FFD166] text-[#FFD166]" />
            </div>

            <h4 className="text-base font-bold text-stone-900 mb-1">🎉 节点已点亮！</h4>
            <p className="text-xs text-stone-400 mb-4">
              这颗星星是你给自己的笃定，它不会被累计成虚浮的积分，但已经刻进你的经历里。
            </p>

            <div className="p-4 rounded-2xl glass-card-strong text-left mb-5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#78649E] mb-1.5">
                <Sparkles size={13} className="text-[#FF7A50]" />
                <span>想成为的自己对你说：</span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed font-serif-sc">{aiCompletionResponse}</p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors shadow-2xs"
            >
              收下肯定，继续向前
            </button>
          </div>
        )}
      </div>
    </CompanionDialog>
  )
}
