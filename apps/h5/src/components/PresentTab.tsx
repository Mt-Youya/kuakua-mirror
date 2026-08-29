import React, { useState } from "react"
import { Sparkles, Heart, ChevronDown, ChevronUp, RefreshCw, Quote, Share2 } from "lucide-react"
import { UserProfile, Moment, Praise, Theme } from "../types"
import { virtualGeneratePraise } from "../lib/virtualData"
import { Header } from "./Header"
import { SharePraiseModal } from "./SharePraiseModal"
import { Sparkles as StarSparkles } from "./Sparkles"
import { CharReveal } from "./CharReveal"
import { NumberTicker } from "./NumberTicker"
import { useAppUiStore } from "../store/useAppUiStore"

interface PresentTabProps {
  user: UserProfile
  moments: Moment[]
  themes: Theme[]
  dailyPraise: Praise
  mirrorPraise?: Praise
  onToggleLikeMoment: (momentId: string) => void
  onToggleLikeDailyPraise: () => void
  onToggleLikeMirrorPraise: () => void
  onSaveMoment: (moment: Partial<Moment>) => void
  onUpdateUser?: (updated: Partial<UserProfile>) => void
}

const FIRST_PERSON_PRAISES = [
  "今天我看见了自己眼神里的笃定与松弛。我没有等“万事俱备”，而是带着哪怕一点点不确定也往前迈了一小步。",
  "今天我把那些在心里绕着的不安，变成了真实的沟通。我不需要变得完美才值得被肯定，现在的我一直在发光。",
  "今天我愿意把脑海里的第一句话说出来，不再在心底打磨十遍。每一次肯定，都是对自己的深度滋养。",
  "今天我温和地护住了自己的边界，把时间和精力留给了真正重要的事情。这是我自我笃定的开始。",
  "今天即使手在微微发抖，我也依然把话说完了——那一刻我战胜的不是别人，而是过去的犹豫。",
  "今天我放下了对绝对完美的苛求，允许自己先完成再完善，我的每一步都有分量。",
]

export const PresentTab: React.FC<PresentTabProps> = ({
  user,
  moments,
  dailyPraise,
  mirrorPraise,
  onToggleLikeMoment,
  onToggleLikeDailyPraise,
  onToggleLikeMirrorPraise,
  onSaveMoment,
  onUpdateUser,
}) => {
  const setIsProfileOpen = useAppUiStore((state) => state.setIsProfileOpen)
  // State for first-person "今日夸夸"
  const [currentPraiseIndex, setCurrentPraiseIndex] = useState(0)
  const [currentPraise, setCurrentPraise] = useState<string>(FIRST_PERSON_PRAISES[0])
  const [isGeneratingPraise, setIsGeneratingPraise] = useState(false)

  // 生成分享卡片弹窗
  const [isShareOpen, setIsShareOpen] = useState(false)

  // Expanded original records in moment list (key: momentId)
  const [expandedUserRecords, setExpandedUserRecords] = useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) => {
    setExpandedUserRecords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Refresh or generate fresh first-person praise
  const handleRefreshPraise = async () => {
    setIsGeneratingPraise(true)
    try {
      // 虚拟数据引擎：随机文案池（无后端、无网络依赖）
      const praise = virtualGeneratePraise()
      if (praise) {
        setCurrentPraise(praise)
      } else {
        const nextIdx = (currentPraiseIndex + 1) % FIRST_PERSON_PRAISES.length
        setCurrentPraiseIndex(nextIdx)
        setCurrentPraise(FIRST_PERSON_PRAISES[nextIdx])
      }
    } catch (err) {
      const nextIdx = (currentPraiseIndex + 1) % FIRST_PERSON_PRAISES.length
      setCurrentPraiseIndex(nextIdx)
      setCurrentPraise(FIRST_PERSON_PRAISES[nextIdx])
    } finally {
      setIsGeneratingPraise(false)
    }
  }

  // 首页只展示用户喜欢的夸夸（点过爱心的记录）
  const likedMoments = moments.filter((m) => m.liked)

  return (
    <div className="animate-fade-in relative">
      {/* 背景星星粒子（暖色星光氛围） */}
      <StarSparkles className="z-0" />

      {/* 此刻页内嵌顶部栏（固定置顶，含昵称、理想自我、头像） */}
      <Header user={user} onOpenProfile={() => setIsProfileOpen(true)} />

      <div className="pb-24 pt-2 px-4 max-w-md mx-auto space-y-4">
        {/* ─────────────────────────────────────────────────────────────
            1. 页面标题（含数据）：这个月你有 X 天夸夸自己
            ───────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl glass-card-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF7A50] animate-pulse"></div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-stone-800 tracking-tight">
                这个月你有{" "}
                <NumberTicker
                  value={user.daysActiveThisMonth || 12}
                  className="text-[#FF7A50] font-extrabold text-lg"
                />{" "}
                天夸夸自己
              </h1>
              <p className="text-[11px] text-stone-400 mt-0.5">每一次肯定，都在把内耗化为自我笃定的力量</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] px-2.5 py-1 rounded-full glass-card-strong text-[#78649E] font-medium shadow-2xs">
              持续点亮中
            </span>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
          2. 功能卡片：夸夸镜在线 (仅显示今日夸夸，口吻都是“我”对自己说的话，无夸夸自己按钮)
          ───────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl p-5 glass-card-strong space-y-3.5">
          {/* Soft atmospheric backlight */}
          <div className="absolute -right-12 -top-12 w-36 h-36 rounded-full bg-[#FF7A50]/15 blur-3xl pointer-events-none"></div>
          <div className="absolute -left-12 -bottom-12 w-36 h-36 rounded-full bg-[#C8B8D9]/20 blur-3xl pointer-events-none"></div>

          {/* 2.1 功能卡片标题：夸夸镜在线 */}
          <div className="flex items-center justify-between relative z-10 border-b border-stone-200/50 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400"></span>
              <h2 className="text-sm font-bold text-stone-800 tracking-wide flex items-center gap-1.5">
                <span>夸夸镜在线</span>
              </h2>
            </div>
            <span className="text-[10px] text-stone-400 px-2 py-0.5 rounded-full glass-card-subtle font-normal">
              硬件已同步
            </span>
          </div>

          {/* 2.2 今日夸夸 / 每日一夸（去边框，减少层层叠叠） */}
          <div className="relative z-10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#FF7A50] flex items-center gap-1 px-2.5 py-0.5 rounded-full glass-card-strong">
                  <Sparkles size={11} className="fill-[#FF7A50]" />
                  <span>今日夸夸</span>
                </span>
                <span className="text-[10px] text-stone-400">· 我对自己说的话</span>
              </div>

              <button
                id="refresh-today-praise-btn"
                onClick={handleRefreshPraise}
                disabled={isGeneratingPraise}
                className="text-[11px] px-2 py-0.5 rounded-full glass-card-subtle text-stone-500 hover:text-[#FF7A50] transition-colors flex items-center gap-1 cursor-pointer"
                title="换一句今日夸夸"
              >
                <RefreshCw size={11} className={isGeneratingPraise ? "animate-spin text-[#FF7A50]" : ""} />
                <span>换一句</span>
              </button>
            </div>

            {/* First-person Praise Quote（逐字浮现） */}
            <div className="relative pt-1 pl-3 pr-2">
              <Quote size={18} className="absolute -top-1 -left-1 text-[#FF7A50]/20 rotate-180 pointer-events-none" />
              <CharReveal
                key={currentPraise}
                text={`“${currentPraise}”`}
                charDelay={24}
                className={`text-xs sm:text-[13px] text-stone-800 leading-relaxed font-serif-sc transition-opacity duration-300 ${
                  isGeneratingPraise ? "opacity-30" : "opacity-100"
                }`}
              />
            </div>

            {/* 2.3 生成分享卡片（下方居中） */}
            <div className="flex justify-center pt-1">
              <button
                id="share-praise-btn"
                onClick={() => setIsShareOpen(true)}
                className="text-[11px] px-3.5 py-1.5 rounded-full glass-card-subtle text-[#78649E] hover:text-[#FF7A50] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 size={12} />
                <span>生成分享卡片</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
          3. 今日夸夸记录 (完全按照原型 P1：优先展示夸夸内容，有记录的提供展开查看我当时发了什么)
          ───────────────────────────────────────────────────────────── */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-bold text-stone-800 tracking-wide flex items-center gap-1.5">
                <span>今日夸夸记录</span>
                <span className="text-[10px] text-[#78649E] font-medium px-2 py-0.5 rounded-full glass-card-strong">
                  已喜欢 {likedMoments.length} 条
                </span>
              </h2>
            </div>
            <span className="text-[10px] text-stone-400">点过爱心的夸夸都在这里</span>
          </div>

          {/* List of liked praises（云朵弹幕 · 自动向左飘，卡片顶部对齐等高铁轨） */}
          <div className="overflow-hidden -mx-1 px-1">
            <div className="cloud-marquee flex gap-3 pb-6 items-start">
              {[...likedMoments, ...likedMoments].map((moment, index) => {
                const isClone = index >= likedMoments.length
                const hasUserOriginalRecord = Boolean(
                  moment.content && moment.content.trim().length > 0 && moment.kind !== "hardware"
                )
                const isExpanded = !!expandedUserRecords[moment.id]
                const praiseText = moment.response || moment.content

                return (
                  <div
                    key={`${moment.id}-${index}`}
                    id={isClone ? undefined : `today-praise-card-${moment.id}`}
                    className={`glass-card-subtle-flat cloud-card shrink-0 w-[240px] p-4 text-stone-800 flex flex-col ${
                      isExpanded ? "" : "h-[148px]"
                    }`}
                  >
                    {/* 首行：来源标签 + 日期 + 爱心（三元素） */}
                    <div className="flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {moment.kind === "hardware" ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200/60 shrink-0">
                            硬件镜面
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full glass-card-subtle text-[#78649E] font-medium shrink-0">
                            软件记录
                          </span>
                        )}
                        <span className="text-[10px] text-stone-400 truncate">{moment.createdAt}</span>
                      </div>

                      <button
                        id={isClone ? undefined : `like-moment-btn-${moment.id}`}
                        onClick={() => onToggleLikeMoment(moment.id)}
                        className={`p-1 rounded-full transition-all cursor-pointer shrink-0 ${
                          moment.liked ? "text-rose-500 fill-rose-500" : "text-stone-300 hover:text-stone-500"
                        }`}
                        title={moment.liked ? "已珍藏" : "点赞"}
                      >
                        <Heart size={14} className={moment.liked ? "fill-rose-500 text-rose-500" : ""} />
                      </button>
                    </div>

                    {/* 夸夸内容：固定高度 line-clamp-2，卡片大小一致 */}
                    <p className="flex-1 min-h-0 mt-2 text-xs text-stone-800 leading-relaxed font-serif-sc line-clamp-2">
                      {praiseText}
                    </p>

                    {/* 底部行：展开原话 / 纯净夸夸（占位保持等高） */}
                    {hasUserOriginalRecord ? (
                      <div className="shrink-0 pt-1.5">
                        <button
                          id={isClone ? undefined : `toggle-user-record-btn-${moment.id}`}
                          onClick={() => toggleExpand(moment.id)}
                          className="text-[10px] text-stone-400 hover:text-[#FF7A50] flex items-center gap-0.5 transition-colors cursor-pointer"
                        >
                          <span>{isExpanded ? "收起原话" : "展开原话"}</span>
                          {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                        {isExpanded && (
                          <div className="pt-1 animate-fade-in">
                            <div className="pl-2 border-l-2 border-[#FF7A50] text-[11px] text-stone-600 leading-relaxed">
                              {moment.content}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="shrink-0 pt-1.5">
                        <span className="text-[10px] text-stone-400 italic">来自镜前感知 · 纯净夸夸</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 生成分享卡片弹窗 */}
        <SharePraiseModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          praise={currentPraise}
          nickname={user.nickname}
        />
      </div>
    </div>
  )
}
