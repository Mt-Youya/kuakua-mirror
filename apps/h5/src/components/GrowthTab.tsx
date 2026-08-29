import React, { useState } from "react"
import {
  Sprout,
  Lock,
  Unlock,
  ChevronRight,
  Sparkles,
  Star,
  CheckCircle2,
  HelpCircle,
  ArrowLeft,
  Share2,
  FileText,
  Clock,
  PauseCircle,
} from "lucide-react"
import { Theme, Milestone, UserProfile, DiscoveredTrait, Moment } from "../types"
import { MilestoneModal } from "./MilestoneModal"
import { GrowthStoryModal } from "./GrowthStoryModal"
import { MyTracesModal } from "./MyTracesModal"
import { TraitModal } from "./TraitModal"
import confetti from "canvas-confetti"

interface GrowthTabProps {
  user: UserProfile
  themes: Theme[]
  moments: Moment[]
  traitCandidate: DiscoveredTrait | null
  claimedTraits: DiscoveredTrait[]
  onClaimTrait: (traitId: string) => void
  onSkipTrait: (traitId: string) => void
  onCompleteMilestone: (
    milestoneId: string,
    evidenceText: string,
    evidencePhoto?: string,
    difficultyScore?: number
  ) => Promise<string>
  onPauseMilestone: (milestoneId: string) => void
  onResumeMilestone: (milestoneId: string) => void
  onOpenTheme: (themeId: string) => void
}

export const GrowthTab: React.FC<GrowthTabProps> = ({
  user,
  themes,
  moments,
  traitCandidate,
  claimedTraits,
  onClaimTrait,
  onSkipTrait,
  onCompleteMilestone,
  onPauseMilestone,
  onResumeMilestone,
  onOpenTheme,
}) => {
  const [activeThemeDetailId, setActiveThemeDetailId] = useState<string | null>(null)
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false)
  const [isTracesOpen, setIsTracesOpen] = useState(false)
  const [tracesTheme, setTracesTheme] = useState<Theme | null>(null)
  // 认领后的分享卡片 / 我发现的自己详情
  const [shareTrait, setShareTrait] = useState<DiscoveredTrait | null>(null)
  const [detailTrait, setDetailTrait] = useState<DiscoveredTrait | null>(null)

  // 进行中的成长线（可多条）：已解锁的主题
  const activeThemes = themes.filter((t) => t.isUnlocked)
  const activeTheme = activeThemes[0] || themes[0]
  const lockedThemes = themes.filter((t) => !t.isUnlocked)

  const openMilestoneDetail = (m: Milestone) => {
    setSelectedMilestone(m)
  }

  // If in Theme Growth Path detail view
  if (activeThemeDetailId) {
    const detailTheme = themes.find((t) => t.id === activeThemeDetailId) || activeTheme
    const detailInProgress = detailTheme.milestones.find((m) => m.status === "in_progress")
    const detailLocation = detailInProgress
      ? `M${detailInProgress.order} · ${detailInProgress.title.replace(/^M\d+ · /, "")}`
      : "起点"

    return (
      <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4 animate-fade-in">
        {/* Back navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveThemeDetailId(null)}
            className="flex items-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-900 glass-card-subtle px-3 py-1.5 rounded-full"
          >
            <ArrowLeft size={14} />
            <span>返回主题列表</span>
          </button>
          <button
            id="view-growth-story-btn"
            onClick={() => setIsStoryModalOpen(true)}
            className="text-xs px-3 py-1.5 rounded-full glass-card-subtle text-[#FF7A50] font-medium flex items-center gap-1 hover:text-[#FA6400]"
          >
            <Sparkles size={12} />
            <span>查看成长故事卡</span>
          </button>
        </div>

        {/* Theme title header */}
        <div className="p-4 rounded-3xl glass-card-strong">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#78649E] mb-1">
            <Unlock size={14} className="text-[#FF7A50]" />
            <span>正在进行的成长主题</span>
          </div>
          <h2 className="text-lg font-bold text-stone-900 font-serif-sc">{detailTheme.name}</h2>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">{detailTheme.tagline}</p>
        </div>

        {/* Top "你说过" section (PRD Section 4.4: 先看见你，再建议你) */}
        <div className="p-4 rounded-3xl glass-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-700">关于这件事，你说过</span>
            <span className="text-[10px] text-stone-400">真实原话是最好的镜子</span>
          </div>

          <div className="space-y-2">
            {detailTheme.userQuotes.map((q, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-2xl glass-card-subtle text-xs text-stone-700 leading-relaxed font-serif-sc"
              >
                <span className="text-[10px] font-semibold text-[#FF7A50] mr-1.5">{q.date}</span>
                <span>“{q.quote}”</span>
              </div>
            ))}
          </div>
        </div>

        {/* Winding Mountain Growth Path (蜿蜒山路路径) */}
        <div className="p-5 rounded-3xl glass-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-stone-800">你走到的路径</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full glass-card-subtle text-[#78649E]">
              当前定位：{detailLocation}
            </span>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-emerald-400 before:via-[#FF7A50] before:to-stone-200">
            {detailTheme.milestones.map((m) => {
              const isCompleted = m.status === "completed"
              const isInProgress = m.status === "in_progress"
              const isPaused = m.status === "paused"
              const isPending = m.status === "pending"

              return (
                <div
                  key={m.id}
                  onClick={() => (isInProgress || isCompleted || isPaused) && openMilestoneDetail(m)}
                  className={`relative pl-3 transition-all ${
                    isInProgress || isCompleted || isPaused ? "cursor-pointer" : "opacity-60"
                  }`}
                >
                  {/* Node Icon on path */}
                  <div
                    className={`absolute -left-[19px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? "bg-emerald-500 text-white shadow-2xs"
                        : isInProgress
                          ? "bg-[#FF7A50] text-white ring-4 ring-[#FF7A50]/20 animate-soft-pulse"
                          : isPaused
                            ? "bg-[#C8B8D9] text-white shadow-2xs"
                            : "bg-white border-2 border-stone-300 text-stone-300"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={14} />
                    ) : isInProgress ? (
                      <Star size={12} className="fill-white" />
                    ) : isPaused ? (
                      <PauseCircle size={13} />
                    ) : (
                      <span className="text-[10px] font-bold">{m.order}</span>
                    )}
                  </div>

                  {/* Node Card */}
                  <div
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isInProgress
                        ? "glass-card-strong border-white/95"
                        : isCompleted || isPaused
                          ? "glass-card"
                          : "glass-card-subtle opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${isInProgress ? "text-[#FF7A50]" : "text-stone-800"}`}>
                        {m.title}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {isCompleted ? "✓ 已完成" : isInProgress ? "📍 进行中" : isPaused ? "⏸ 已暂停" : "未解锁"}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed font-serif-sc">{m.description}</p>

                    {isInProgress && (
                      <div className="mt-2 pt-2 border-t border-stone-200/50 flex items-center justify-between">
                        <span className="text-[10px] text-stone-500">点击进入本项任务与思考</span>
                        <span className="text-xs font-semibold text-[#FF7A50] flex items-center gap-0.5">
                          开始试水 →
                        </span>
                      </div>
                    )}

                    {isPaused && (
                      <div className="mt-2 pt-2 border-t border-stone-200/50 flex items-center justify-between">
                        <span className="text-[10px] text-stone-500">先放一放也没关系</span>
                        <span className="text-xs font-semibold text-[#78649E] flex items-center gap-0.5">
                          点击继续这项 →
                        </span>
                      </div>
                    )}

                    {isCompleted && m.evidenceText && (
                      <p className="text-[11px] text-stone-400 mt-1 italic">当时记录：“{m.evidenceText}”</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Milestone Modal */}
        <MilestoneModal
          isOpen={!!selectedMilestone}
          onClose={() => setSelectedMilestone(null)}
          milestone={selectedMilestone}
          themeTitle={detailTheme.name}
          user={user}
          onCompleteMilestone={onCompleteMilestone}
          onPauseMilestone={onPauseMilestone}
          onResumeMilestone={onResumeMilestone}
        />

        {/* Growth Story Modal */}
        <GrowthStoryModal
          isOpen={isStoryModalOpen}
          onClose={() => setIsStoryModalOpen(false)}
          theme={detailTheme}
          user={user}
        />
      </div>
    )
  }

  // Default Themes List View (PRD Section 4.4)
  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4 animate-fade-in">
      {/* Top diary slogan */}
      <div className="px-2 py-1">
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">成长 · THEMES</h2>
        <p className="text-sm font-semibold text-stone-800 font-serif-sc">我最近一直在想的那件事，是什么？</p>
      </div>

      {/* 1. Active Themes: ── 现在面对的 ── (可多条成长线) */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-xs font-bold text-stone-700">── 现在面对的 ──</span>
          <span className="text-[10px] text-stone-400">已开启成长线</span>
        </div>

        <div className="space-y-2.5">
          {activeThemes.map((theme) => {
            const inProgressMs = theme.milestones.find((m) => m.status === "in_progress")
            const locationLabel = inProgressMs
              ? `M${inProgressMs.order} · ${inProgressMs.title.replace(/^M\d+ · /, "")}`
              : `M${theme.currentMilestoneOrder ?? 1} · 起点`

            return (
              <div
                key={theme.id}
                id={`active-theme-card-${theme.id}`}
                onClick={() => setActiveThemeDetailId(theme.id)}
                className={`rounded-3xl p-4 glass-card glass-card-hover cursor-pointer group ${
                  theme.isFree ? "animate-soft-pulse" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#FF7A50]">
                    <Unlock size={14} />
                    <span>{theme.name}</span>
                    {theme.isFree && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50/90 text-amber-700 border border-amber-200/80 font-medium">
                        ✨ 新增的路
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full glass-card-subtle text-[#78649E] font-medium">
                    📍 当前：{locationLabel}
                  </span>
                </div>

                <p className="text-xs text-stone-700 font-serif-sc leading-relaxed mb-3">{theme.tagline}</p>

                <div className="flex items-center justify-between text-xs pt-2.5 border-t border-stone-200/50">
                  <span className="text-[11px] text-stone-400">
                    包含 {theme.totalMilestones || 7} 个循序渐进的微小刻意练习
                  </span>
                </div>

                {/* 底部并列入口：查看成长路径 | 我的痕迹 */}
                <div className="flex items-center justify-center gap-3 pt-2.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveThemeDetailId(theme.id)
                    }}
                    className="text-xs text-[#FF7A50] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform cursor-pointer"
                  >
                    查看成长路径 →
                  </button>
                  <span className="w-px h-3.5 bg-stone-200"></span>
                  <button
                    id={`view-my-traces-btn-${theme.id}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setTracesTheme(theme)
                      setIsTracesOpen(true)
                    }}
                    className="text-xs text-stone-600 font-medium hover:text-stone-900 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    📖 我的痕迹
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. ✨ 新的可能：镜子主动发现优势（历史记录 → 换角度呈现 → 认领） */}
      {traitCandidate && (
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-bold text-[#78649E] flex items-center gap-1">
              <Sparkles size={13} className="text-[#FF7A50]" />
              <span>── 新的可能 ──</span>
            </span>
            <span className="text-[10px] text-stone-400">镜子发现你的闪光面</span>
          </div>

          <div className="rounded-3xl p-4 glass-card-strong relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-28 h-28 rounded-full bg-[#FF7A50]/15 blur-3xl pointer-events-none"></div>

            <div className="inline-block px-2.5 py-0.5 rounded-full glass-card-subtle text-[#78649E] text-[10px] font-semibold mb-2">
              ✨ 从你的记录里，我看到了
            </div>

            <h3 className="text-base font-bold text-stone-900 font-serif-sc mb-1.5">{traitCandidate.title}</h3>
            <p className="text-xs text-stone-700 leading-relaxed font-serif-sc mb-3">{traitCandidate.description}</p>

            {/* 证据：历史记录引用 */}
            <div className="space-y-1.5 mb-3">
              {traitCandidate.evidence.map((ev, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl glass-card-subtle text-[11px] text-stone-600 leading-relaxed font-serif-sc"
                >
                  <span className="font-semibold text-[#FF7A50] mr-1">{ev.date}</span>“{ev.quote}”
                </div>
              ))}
            </div>

            {/* Actions: [认领这一面] [换一个看看] */}
            <div className="flex items-center gap-2 pt-2 border-t border-stone-200/50">
              <button
                id="claim-trait-btn"
                onClick={() => {
                  confetti({
                    particleCount: 70,
                    spread: 60,
                    origin: { y: 0.6 },
                    colors: ["#FF7A50", "#C8B8D9", "#9CD9C9", "#FFD166"],
                  })
                  onClaimTrait(traitCandidate.id)
                  setShareTrait(traitCandidate)
                }}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#FF8A65] to-[#FF7A50] text-white text-[11px] font-semibold shadow-md shadow-[#FF7A50]/20 hover:opacity-95 transition-all"
              >
                认领这一面（收藏）
              </button>
              <button
                id="skip-trait-btn"
                onClick={() => onSkipTrait(traitCandidate.id)}
                className="py-2 px-3 rounded-xl glass-card-subtle text-stone-600 text-[11px] hover:text-stone-900 transition-colors"
              >
                换一个看看
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2.5 我发现的自己：只显示标题，点击打开小弹窗查看细节 */}
      {claimedTraits.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-bold text-stone-700">── 我发现的自己 ──</span>
            <span className="text-[10px] text-stone-400">已认领 {claimedTraits.length} 面</span>
          </div>

          <div className="space-y-2">
            {claimedTraits.map((trait) => (
              <button
                key={trait.id}
                id={`claimed-trait-btn-${trait.id}`}
                onClick={() => setDetailTrait(trait)}
                className="w-full rounded-2xl glass-card glass-card-hover px-3.5 py-2.5 flex items-center justify-between text-left cursor-pointer"
              >
                <span className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                  <Sparkles size={13} className="text-[#FF7A50]" />
                  <span>{trait.title}</span>
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200/60">
                    ✓ 已认领
                  </span>
                  <ChevronRight size={13} className="text-stone-300" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Locked Themes: ── 还没打开的 ── */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-xs font-bold text-stone-500">── 还没打开的 ──</span>
          <span className="text-[10px] text-stone-400">你最想先打开哪个？</span>
        </div>

        <div className="space-y-2.5">
          {lockedThemes.map((theme) => (
            <div
              key={theme.id}
              className="rounded-3xl p-3.5 glass-card glass-card-hover flex items-center justify-between"
            >
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-2xl glass-card-subtle text-stone-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-800">{theme.name}</h4>
                  <p className="text-[11px] text-stone-400 line-clamp-1">{theme.tagline}</p>
                </div>
              </div>

              <button
                id={`open-theme-btn-${theme.id}`}
                onClick={() => onOpenTheme(theme.id)}
                className="text-[11px] px-3 py-1.5 rounded-full font-medium transition-all shrink-0 border shadow-2xs bg-gradient-to-r from-[#FF8A65] to-[#FF7A50] text-white hover:opacity-95 cursor-pointer"
              >
                想先开它
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 我的痕迹 Modal（列表视图入口，主题随点击的卡片） */}
      {tracesTheme && (
        <MyTracesModal
          isOpen={isTracesOpen}
          onClose={() => setIsTracesOpen(false)}
          theme={tracesTheme}
          moments={moments}
        />
      )}

      {/* 认领后的分享卡片 / 我发现的自己详情弹窗 */}
      {shareTrait && <TraitModal isOpen onClose={() => setShareTrait(null)} trait={shareTrait} mode="share" />}
      {detailTrait && <TraitModal isOpen onClose={() => setDetailTrait(null)} trait={detailTrait} mode="detail" />}
    </div>
  )
}
