import React, { useState, useMemo, useRef, useEffect } from "react"
import {
  Search,
  X,
  Sparkles,
  Heart,
  MoonStar,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Lock,
  Share2,
} from "lucide-react"
import { DailyReviewData, WeeklyReviewData, Moment, UserProfile } from "../types"
import { buildMoonFlipCards } from "../data/moonReframing"
import { useAppUiStore } from "../store/useAppUiStore"

interface ReviewTabProps {
  dailyReview: DailyReviewData
  weeklyReview: WeeklyReviewData
  moments: Moment[]
  user?: UserProfile
  onToggleLikeMoment?: (momentId: string) => void
}

interface CalendarDay {
  dayNumber: number
  hasRecord: boolean
}

// 解析记录时间：'8月26日' → 8/26；'刚刚' / '今天' / '08:45 来自夸夸镜' → 今天
function parseMomentDate(createdAt: string): { month: number; day: number } {
  const match = createdAt.match(/(\d{1,2})月(\d{1,2})日/)
  if (match) {
    return { month: parseInt(match[1], 10), day: parseInt(match[2], 10) }
  }
  const now = new Date()
  return { month: now.getMonth() + 1, day: now.getDate() }
}

export const ReviewTab: React.FC<ReviewTabProps> = ({ moments, user, onToggleLikeMoment }) => {
  const setIsChatOpen = useAppUiStore((state) => state.setIsChatOpen)
  // 当前浏览的年月（初始为真实当前月，如 2026年8月）
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)

  // 选中的日历日期（null = 显示当月全部）
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  // 搜索浮层
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // 月度总结弹窗
  const [isMonthlySummaryOpen, setIsMonthlySummaryOpen] = useState(false)
  // 保存月度总结卡的内联反馈（避免 alert 打断）
  const [summarySaved, setSummarySaved] = useState(false)
  const handleSaveSummaryCard = () => {
    setSummarySaved(true)
    setTimeout(() => setSummarySaved(false), 2200)
  }
  // 月面翻转卡：当前卡序号 + 是否已翻面
  const [flipCardIndex, setFlipCardIndex] = useState(0)
  const [flipCardFlipped, setFlipCardFlipped] = useState(false)
  // 打开月度总结时重置到第一张未翻面
  const handleOpenMonthlySummary = () => {
    setFlipCardIndex(0)
    setFlipCardFlipped(false)
    setIsMonthlySummaryOpen(true)
  }

  // 🎞 年度总结式分页滑动画布：记录当前页，供顶部进度点与翻页指示
  const summaryScrollRef = useRef<HTMLDivElement | null>(null)
  const [summaryPage, setSummaryPage] = useState(0)
  const summaryPages = 5 // 封面 / 月面翻转 / 光影镜照 / 特质光谱 / 月影信件 + 完成
  const [isSummaryScrolled, setIsSummaryScrolled] = useState(false)
  // 打开时回到第一页
  useEffect(() => {
    if (isMonthlySummaryOpen) {
      setSummaryPage(0)
      setIsSummaryScrolled(false)
      // 等 DOM 挂载后滚动位置归零
      requestAnimationFrame(() => {
        if (summaryScrollRef.current) summaryScrollRef.current.scrollTop = 0
      })
    }
  }, [isMonthlySummaryOpen])
  // 监听滚动 → 更新当前页
  const handleSummaryScroll = () => {
    const el = summaryScrollRef.current
    if (!el) return
    const page = Math.round(el.scrollTop / el.clientHeight)
    setSummaryPage(Math.max(0, Math.min(summaryPages - 1, page)))
    setIsSummaryScrolled(el.scrollTop > 60)
  }

  // 当月记录
  const monthMoments = useMemo(
    () => moments.filter((m) => parseMomentDate(m.createdAt).month === viewMonth),
    [moments, viewMonth]
  )

  // 本月「月亮另一面」卡：按内耗标签 / 难度 / 负面语义加权取前 3 条
  const moonCards = useMemo(() => buildMoonFlipCards(monthMoments, user), [monthMoments, user])

  // 🎨 特质光谱：从翻转卡的天赋词派生（第一条最亮，星级递减）
  const traitSpectrum = useMemo(() => {
    return moonCards.map((c, i) => ({
      title: c.traitTitle,
      stars: Math.max(4 - i, 1),
    }))
  }, [moonCards])

  // 有记录的日期集合
  const recordedDays = useMemo(() => new Set(monthMoments.map((m) => parseMomentDate(m.createdAt).day)), [monthMoments])

  // 镜面解锁进度：以当月真实记录数为依据
  const targetUnlockCount = 5
  const currentProgressCount = Math.min(targetUnlockCount, monthMoments.length)
  const remainingCount = Math.max(0, targetUnlockCount - currentProgressCount)
  const isFullyUnlocked = currentProgressCount >= targetUnlockCount

  // 筛选后的记录列表（默认当月全部，选中日期时按日过滤）
  const displayedMoments = useMemo(() => {
    if (selectedDay == null) return monthMoments
    return monthMoments.filter((m) => parseMomentDate(m.createdAt).day === selectedDay)
  }, [monthMoments, selectedDay])

  // 动态日历：偏移（周一为列头）与当月天数
  const calendarCells = useMemo((): (CalendarDay | null)[] => {
    const offset = (new Date(viewYear, viewMonth - 1, 1).getDay() + 6) % 7
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => ({
        dayNumber: i + 1,
        hasRecord: recordedDays.has(i + 1),
      })),
    ]
  }, [viewYear, viewMonth, recordedDays])

  // 搜索：匹配原话或夸夸内容（跨月全局检索）
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return moments.filter((m) => m.content.toLowerCase().includes(q) || m.response.toLowerCase().includes(q))
  }, [moments, searchQuery])

  const shiftMonth = (delta: number) => {
    let y = viewYear
    let m = viewMonth + delta
    if (m < 1) {
      m = 12
      y -= 1
    }
    if (m > 12) {
      m = 1
      y += 1
    }
    setViewYear(y)
    setViewMonth(m)
    setSelectedDay(null)
  }

  // 星座星点位置（环绕镜面）
  const constellationStars = [
    { id: 1, top: "22%", left: "18%", label: "瞬间 1" },
    { id: 2, top: "22%", right: "18%", label: "瞬间 2" },
    { id: 3, top: "48%", left: "34%", label: "瞬间 3" },
    { id: 4, top: "48%", right: "34%", label: "瞬间 4" },
    { id: 5, bottom: "15%", left: "50%", label: "瞬间 5", transform: "translateX(-50%)" },
  ]

  const closeSearch = () => {
    setIsSearchOpen(false)
    setSearchQuery("")
  }

  return (
    <div className="pb-28 pt-2 px-4 max-w-md mx-auto space-y-4 animate-fade-in relative">
      {/* ─────────────────────────────────────────────────────────────
          1. 头部：回顾标题 + 搜索图标 + 月份切换（← YYYY年M月 →）
          ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1 py-1">
        <h1 className="text-base sm:text-lg font-bold text-stone-800 tracking-tight">回顾</h1>

        <div className="flex items-center gap-2">
          <button
            id="review-search-open-btn"
            onClick={() => setIsSearchOpen(true)}
            className="p-2 rounded-full glass-card-subtle text-stone-600 hover:text-stone-900 hover:bg-white/80 transition-all cursor-pointer"
            title="搜索留下的瞬间与回忆"
          >
            <Search size={16} />
          </button>

          {/* 月份切换 */}
          <div className="flex items-center gap-0.5 glass-card-subtle rounded-full px-1 py-1 shadow-2xs">
            <button
              onClick={() => shiftMonth(-1)}
              className="p-1 rounded-full text-stone-500 hover:text-[#FF7A50] transition-colors cursor-pointer"
              title="上个月"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-semibold text-stone-800 whitespace-nowrap px-0.5">
              {viewYear}年{viewMonth}月
            </span>
            <button
              onClick={() => shiftMonth(1)}
              className="p-1 rounded-full text-stone-500 hover:text-[#FF7A50] transition-colors cursor-pointer"
              title="下个月"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. 镜面记忆卡片：{viewMonth}月的你（镜面记忆 · 进度解锁月度总结）
          ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-6 glass-card-strong text-center space-y-4 shadow-sm border border-stone-200/80">
        {/* Soft background ambient glow */}
        <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-[#FF7A50]/15 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-[#C8B8D9]/25 blur-3xl pointer-events-none"></div>

        {/* 2.1 镜面记忆星图区域 */}
        <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
          {/* Outer Mirror Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-stone-200/70 shadow-inner bg-gradient-to-b from-white/90 via-stone-50/50 to-stone-100/60 p-2 backdrop-blur-sm">
            {/* Inner mirror glass disc with clarity tied to progress */}
            <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-stone-900/5">
              <img
                src="./user_p1.png"
                alt="镜中的自己"
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover transition-all duration-700 ${
                  isFullyUnlocked
                    ? "blur-0 opacity-100 scale-100"
                    : currentProgressCount === 0
                      ? "blur-md opacity-20 scale-105"
                      : currentProgressCount <= 2
                        ? "blur-[3px] opacity-45 scale-105"
                        : "blur-[1.5px] opacity-80 scale-100"
                }`}
              />

              {/* Fog overlay that clears up with progress */}
              <div
                className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
                  isFullyUnlocked ? "bg-white/0" : "bg-white/40 backdrop-blur-[1px]"
                }`}
              ></div>

              {/* Mirror emblem badge in center */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 text-sm drop-shadow-sm select-none">🪞</div>
            </div>
          </div>

          {/* Connected Constellation Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 opacity-35">
            <line x1="88" y1="26" x2="35" y2="40" stroke="#FF7A50" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="88" y1="26" x2="141" y2="40" stroke="#FF7A50" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="35" y1="40" x2="60" y2="85" stroke="#FF7A50" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="141" y1="40" x2="116" y2="85" stroke="#FF7A50" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="60" y1="85" x2="88" y2="145" stroke="#FF7A50" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="116" y1="85" x2="88" y2="145" stroke="#FF7A50" strokeWidth="1" strokeDasharray="2,2" />
          </svg>

          {/* 5 Constellation Sparkles */}
          {constellationStars.map((star, idx) => {
            const isCollected = idx < currentProgressCount
            return (
              <div
                key={star.id}
                style={{
                  top: star.top,
                  left: star.left,
                  right: star.right,
                  bottom: star.bottom,
                  transform: star.transform,
                }}
                className={`absolute z-20 flex items-center justify-center transition-all duration-500 select-none ${
                  isCollected ? "scale-110 text-[#FF7A50]" : "scale-90 text-stone-300"
                }`}
                title={isCollected ? `已解锁：${star.label}` : `待解锁：${star.label}`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isCollected
                      ? "bg-white shadow-md ring-2 ring-[#FF7A50]/60 animate-pulse"
                      : "bg-white/60 border border-stone-200"
                  }`}
                >
                  <span className={`text-xs font-bold ${isCollected ? "text-[#FF7A50]" : "text-stone-300"}`}>✦</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* 2.2 镜面记忆文案与进度提示 */}
        <div className="space-y-1.5 pt-1">
          <div className="text-xs font-semibold text-stone-600 tracking-wide">这个月的你</div>

          <div className="text-sm font-bold text-stone-900">
            已经留下 <span className="text-[#FF7A50] text-base font-extrabold">{currentProgressCount}</span>{" "}
            个属于自己的瞬间
          </div>

          <div className="text-xs text-stone-500 leading-relaxed font-serif-sc pt-1">
            {isFullyUnlocked ? (
              <p className="text-emerald-700 font-medium">✨ 5 个瞬间已全部点亮，镜子已照出完整的这个月！</p>
            ) : (
              <p>
                再夸夸自己 <span className="text-[#FF7A50] font-bold text-sm">{remainingCount}</span> 次<br />
                镜子就能照出完整的这个月。
              </p>
            )}
          </div>
        </div>

        {/* 2.3 操作区：左侧月度总结（按进度解锁/预览） + 右侧「去聊聊」 */}
        <div className="pt-1 flex items-center justify-center gap-2">
          {isFullyUnlocked ? (
            <button
              id="view-monthly-summary-btn"
              onClick={handleOpenMonthlySummary}
              className="px-4 py-2.5 rounded-2xl glass-card-strong text-stone-700 hover:text-stone-900 border border-stone-200/80 text-xs font-medium shadow-xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>查看月度总结</span>
              <ChevronRight size={13} className="text-stone-400" />
            </button>
          ) : (
            <button
              id="view-monthly-summary-btn"
              onClick={() => setIsMonthlySummaryOpen(true)}
              className="px-4 py-2.5 rounded-2xl glass-card-strong text-stone-700 hover:text-stone-900 border border-stone-200/80 text-xs font-medium shadow-xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
              title="点击预览解锁进度与当前镜面记忆"
            >
              <Lock size={12} className="text-[#FF7A50]" />
              <span>
                镜面解锁中 ({currentProgressCount}/{targetUnlockCount})
              </span>
              <ChevronRight size={13} className="text-stone-400" />
            </button>
          )}

          <button
            id="review-go-chat-btn"
            onClick={() => setIsChatOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF8A65] to-[#FF7A50] text-white text-xs font-semibold shadow-md shadow-[#FF7A50]/20 transition-all hover:opacity-95 hover:scale-[1.02] active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
          >
            <Sparkles size={13} />
            <span>去聊聊</span>
          </button>
        </div>

        <span className="text-[10px] text-stone-400">每一个 ✦ 都是一个“我看见自己的瞬间”</span>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. 日历：我的记忆（左右切换月份 · 有记录标小圆点 · 点击筛选）
          ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl p-4 sm:p-5 glass-card space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold text-stone-800 flex items-center gap-1.5">
            <span>📅 我的记忆</span>
          </h2>
        </div>

        {/* 7-column Weekday Header */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {["一", "二", "三", "四", "五", "六", "日"].map((wd, i) => (
            <span key={i} className="text-[11px] font-semibold text-stone-400 py-0.5">
              {wd}
            </span>
          ))}
        </div>

        {/* Calendar Days Matrix */}
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((item, index) => {
            if (!item) {
              return <div key={`empty-${index}`} className="h-9 w-full"></div>
            }

            const isSelected = selectedDay === item.dayNumber

            return (
              <button
                key={`day-${item.dayNumber}`}
                onClick={() => {
                  if (item.hasRecord) {
                    setSelectedDay(isSelected ? null : item.dayNumber)
                  }
                }}
                disabled={!item.hasRecord}
                className={`h-9 w-full rounded-xl flex flex-col items-center justify-center relative transition-all ${
                  isSelected
                    ? "bg-[#FF7A50] text-white shadow-xs font-bold"
                    : item.hasRecord
                      ? "hover:bg-white/80 text-stone-800 cursor-pointer"
                      : "text-stone-300 cursor-default"
                }`}
                title={
                  item.hasRecord ? `${viewMonth}月${item.dayNumber}日：有夸夸记录` : `${viewMonth}月${item.dayNumber}日`
                }
              >
                <span className={`text-[11px] leading-none ${isSelected ? "text-white" : ""}`}>{item.dayNumber}</span>
                <div className="h-3.5 flex items-center justify-center mt-0.5">
                  {item.hasRecord && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-[#FF7A50]"}`}></span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Calendar Footer Note */}
        <div className="pt-2 border-t border-stone-200/50 flex items-center justify-between text-[10px] text-stone-400">
          <span>有夸夸记录的日子会留下圆点</span>
          <span className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A50] inline-block"></span> 有记录
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. 记录列表：默认当月全部夸夸记录，日期筛选后显示「显示全部」
          ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs sm:text-sm font-bold text-stone-800 tracking-wide flex items-center gap-1.5">
            <span>这个月的夸夸记录</span>
            {selectedDay != null && (
              <span className="text-[10px] text-[#FF7A50] font-medium px-2 py-0.5 rounded-full glass-card-strong">
                {viewMonth}月{selectedDay}日
              </span>
            )}
          </h2>
          {selectedDay != null ? (
            <button
              onClick={() => setSelectedDay(null)}
              className="text-[10px] text-[#FF7A50] hover:underline font-medium cursor-pointer"
            >
              显示全部
            </button>
          ) : (
            <span className="text-[10px] text-stone-400">共 {displayedMoments.length} 条</span>
          )}
        </div>

        {monthMoments.length === 0 ? (
          <div className="p-8 text-center glass-card rounded-3xl text-stone-400 text-xs">这个月还没有留下夸夸记录</div>
        ) : displayedMoments.length === 0 ? (
          <div className="p-8 text-center glass-card rounded-3xl text-stone-400 text-xs">这一天还没有留下夸夸记录</div>
        ) : (
          <div className="space-y-3">
            {displayedMoments.map((moment) => (
              <div
                key={moment.id}
                id={`moment-item-${moment.id}`}
                className="glass-card glass-card-hover rounded-3xl p-4 sm:p-5 text-stone-800 space-y-2.5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-500 font-serif-sc">{moment.createdAt}</span>

                  <div className="flex items-center gap-1.5">
                    {moment.themeTitle && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full glass-card-subtle text-[#78649E] font-medium">
                        {moment.themeTitle}
                      </span>
                    )}
                    <button
                      onClick={() => onToggleLikeMoment && onToggleLikeMoment(moment.id)}
                      className={`p-1 rounded-full transition-all cursor-pointer ${
                        moment.liked ? "text-rose-500 fill-rose-500" : "text-stone-300 hover:text-stone-500"
                      }`}
                      title={moment.liked ? "已珍藏" : "点赞"}
                    >
                      <Heart size={13} className={moment.liked ? "fill-rose-500 text-rose-500" : ""} />
                    </button>
                  </div>
                </div>

                {moment.content && (
                  <div className="rounded-2xl p-3 glass-card-strong border border-stone-200/60">
                    <p className="text-xs sm:text-[13px] font-medium text-stone-900 leading-relaxed font-serif-sc">
                      「{moment.content}」
                    </p>
                  </div>
                )}

                {moment.response && (
                  <div className="pl-3 border-l-2 border-[#FF7A50]/50 py-0.5">
                    <p className="text-xs text-stone-600 leading-relaxed">{moment.response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. 月度总结弹窗（解锁与完整版）
          ───────────────────────────────────────────────────────────── */}
      {isMonthlySummaryOpen && (
        <div className="h5-fullscreen z-50 bg-hero-glow animate-fade-in overflow-hidden flex flex-col">
          {/* 顶部进度点：显示当前第几幕（chapters 数量） */}
          <div className="absolute top-12 left-0 right-0 px-5 flex items-center justify-between pointer-events-none z-20">
            <div className="flex items-center gap-1.5">
              <MoonStar size={12} className="text-[#FF7A50]" />
              <span className="text-[10px] font-semibold text-stone-600">{viewMonth}月月度镜面总结</span>
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: summaryPages }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === summaryPage
                      ? "w-4 bg-[#FF7A50]"
                      : i < summaryPage
                        ? "w-1.5 bg-[#FF7A50]/50"
                        : "w-1.5 bg-stone-300"
                  }`}
                ></span>
              ))}
            </div>
            <button
              onClick={() => setIsMonthlySummaryOpen(false)}
              title="关闭"
              className="p-1.5 rounded-full text-stone-500 hover:text-stone-700 hover:bg-white/70 transition-colors cursor-pointer pointer-events-auto"
            >
              <X size={15} />
            </button>
          </div>

          {/* 分页滚动容器：每屏定格（snap），非卡片，直接铺满 */}
          <div
            ref={summaryScrollRef}
            onScroll={handleSummaryScroll}
            className="flex-1 overflow-y-auto snap-y snap-mandatory h-dvh [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {/* ─── 第 1 幕 · 封面 ─── */}
            <section className="snap-start snap-always h-full min-h-dvh flex flex-col items-center justify-center px-8 relative overflow-hidden">
              <div className="absolute -left-12 -top-12 w-48 h-48 rounded-full bg-[#FF7A50]/15 blur-3xl pointer-events-none"></div>
              <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-[#C8B8D9]/25 blur-3xl pointer-events-none"></div>
              {!isFullyUnlocked && (
                <div className="mb-4 px-3 py-1.5 rounded-full bg-amber-50/90 border border-amber-200/80 text-amber-800 text-[10px] font-medium">
                  镜面记忆解锁中 {currentProgressCount}/{targetUnlockCount} · 还需 {remainingCount} 次解锁完整总结
                </div>
              )}
              <div className="w-16 h-16 rounded-full bg-white/70 backdrop-blur-md shadow-lg shadow-[#FF7A50]/10 flex items-center justify-center moon-breathe">
                <MoonStar size={28} className="text-[#FF7A50]" />
              </div>
              <h2 className="mt-6 text-lg font-bold text-stone-800 font-serif-sc text-center leading-relaxed">
                {viewMonth} 月<br />
                你的月亮另一面
              </h2>
              <p className="mt-3 text-xs text-stone-500 font-serif-sc text-center leading-relaxed">
                {currentProgressCount} 个瞬间，
                <br />5 面未被发现的天赋。
              </p>
              <div className="mt-10 animate-soft-pulse text-stone-400">
                <ChevronDown size={22} />
              </div>
            </section>

            {/* ─── 第 2 幕 · 月面翻转（可翻阅翻转卡；翻面后整页从夜色转亮月暖光） ─── */}
            <section className="snap-start snap-always h-full min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden">
              {/* 背景层 1：暗月夜色（未翻面） */}
              <div
                className={`absolute inset-0 transition-opacity duration-700 bg-gradient-to-b from-[#121A33] via-[#0B0F1E] to-[#101527] ${flipCardFlipped ? "opacity-0" : "opacity-100"}`}
              ></div>
              {/* 背景层 2：亮月暖光（翻面后浮现） */}
              <div
                className={`absolute inset-0 transition-opacity duration-700 bg-gradient-to-b from-[#FFFDF8] via-[#FDF6EC] to-[#FBE9D8] ${flipCardFlipped ? "opacity-100" : "opacity-0"}`}
              ></div>
              {/* 亮态光斑 */}
              <div
                className={`absolute -left-10 -top-10 w-40 h-40 rounded-full bg-[#FF7A50]/15 blur-3xl pointer-events-none transition-opacity duration-700 ${flipCardFlipped ? "opacity-100" : "opacity-0"}`}
              ></div>
              <div
                className={`absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-[#C8B8D9]/25 blur-3xl pointer-events-none transition-opacity duration-700 ${flipCardFlipped ? "opacity-100" : "opacity-0"}`}
              ></div>

              <div className="w-full max-w-[300px] flex flex-col items-center relative z-10">
                <p
                  className={`text-[11px] tracking-[0.3em] mb-4 transition-colors duration-700 ${
                    flipCardFlipped ? "text-[#78649E]" : "text-[#C8B8D9]"
                  }`}
                >
                  🔄 月面翻转 · 你的内耗，是未被发现的天赋
                </p>
                {moonCards.length > 0 ? (
                  <div className="w-full">
                    <div className="moon-flip-container w-full" style={{ height: 240 }}>
                      <div
                        id="moon-flip-summary-inner"
                        className={`moon-flip-inner ${flipCardFlipped ? "is-flipped" : ""}`}
                      >
                        {/* 正面：暗月 · 我以为 */}
                        <div
                          id="moon-flip-summary-front"
                          className="moon-flip-face moon-face-dark flex flex-col justify-between p-5 text-left cursor-pointer"
                          onClick={() => {
                            setFlipCardFlipped(true)
                            if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8)
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-stone-400 tracking-widest">
                              {moonCards[flipCardIndex]?.date}
                            </span>
                            {moonCards[flipCardIndex]?.tag && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-[#C8B8D9] border border-white/15">
                                #{moonCards[flipCardIndex]?.tag}
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            <p className="text-[11px] text-stone-500 tracking-widest">我以为</p>
                            <p className="text-[13px] text-stone-200 font-serif-sc leading-relaxed">
                              “{moonCards[flipCardIndex]?.original}”
                            </p>
                          </div>
                          <div className="flex justify-center">
                            <button
                              id="moon-flip-summary-flip-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                setFlipCardFlipped(true)
                                if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8)
                              }}
                              className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-[#FFD166] text-[11px] font-medium hover:bg-white/15 transition-colors animate-soft-pulse cursor-pointer"
                            >
                              点击翻开月亮的另一面
                            </button>
                          </div>
                        </div>

                        {/* 背面：亮月 · 天赋 */}
                        <div className="moon-flip-face moon-flip-back moon-face-bright flex flex-col justify-between p-5 text-left">
                          <div className="moon-sheen"></div>
                          <div className="flex items-center justify-between relative">
                            <span className="text-[10px] text-[#78649E] tracking-widest">月亮翻过来了</span>
                            <span className="text-base">☀</span>
                          </div>
                          <div className="space-y-2 relative">
                            <p className="text-[11px] text-[#78649E] font-semibold tracking-widest">
                              ✨ 未被发现的天赋
                            </p>
                            <h4 className="text-base font-bold text-stone-900 font-serif-sc leading-snug">
                              {moonCards[flipCardIndex]?.traitTitle}
                            </h4>
                            <p className="text-xs text-stone-700 leading-relaxed font-serif-sc">
                              {moonCards[flipCardIndex]?.reframe}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 页码 + 左右切换 */}
                    <div className="flex items-center justify-center gap-3 mt-4">
                      <button
                        onClick={() => {
                          setFlipCardIndex((prev) => Math.max(0, prev - 1))
                          setFlipCardFlipped(false)
                        }}
                        disabled={flipCardIndex === 0}
                        className={`p-1.5 rounded-full transition-colors cursor-pointer disabled:cursor-default ${
                          flipCardFlipped
                            ? "text-stone-400 hover:text-[#FF7A50] disabled:text-stone-300"
                            : "text-stone-400 hover:text-white disabled:text-stone-600"
                        }`}
                        title="上一张"
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <span
                        className={`text-[11px] transition-colors duration-700 ${flipCardFlipped ? "text-stone-600" : "text-stone-500"}`}
                      >
                        {flipCardIndex + 1} / {moonCards.length}
                      </span>
                      <button
                        onClick={() => {
                          setFlipCardIndex((prev) => Math.min(moonCards.length - 1, prev + 1))
                          setFlipCardFlipped(false)
                        }}
                        disabled={flipCardIndex === moonCards.length - 1}
                        className={`p-1.5 rounded-full transition-colors cursor-pointer disabled:cursor-default ${
                          flipCardFlipped
                            ? "text-stone-400 hover:text-[#FF7A50] disabled:text-stone-300"
                            : "text-stone-400 hover:text-white disabled:text-stone-600"
                        }`}
                        title="下一张"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 font-serif-sc leading-relaxed text-center">
                    这个月你没有留下想要翻转的困扰。
                    <br />
                    那些没有写下来的日子，也是月光的一部分。
                  </p>
                )}
                <div
                  className={`mt-6 animate-soft-pulse transition-colors duration-700 ${flipCardFlipped ? "text-stone-400/70" : "text-[#C8B8D9]/60"}`}
                >
                  <ChevronDown size={20} />
                </div>
              </div>
            </section>
            {/* ─── 第 3 幕 · 光影镜照 ─── */}
            <section className="snap-start snap-always h-full min-h-dvh flex flex-col items-center justify-center px-8 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#FF7A50]/10 blur-3xl pointer-events-none"></div>
              <div className="w-full max-w-[320px] flex flex-col items-center">
                <p className="text-[11px] tracking-[0.3em] text-[#78649E] mb-6">🪞 光影镜照 · 温柔地看待自己</p>
                <div className="space-y-4 w-full">
                  {moonCards.slice(0, 2).map((card) => (
                    <div key={card.id} className="space-y-1.5">
                      <p className="text-sm font-serif-sc text-stone-800 leading-relaxed">
                        <span className="text-[#FF7A50] font-semibold text-xs mr-1">{card.date}</span>「{card.original}
                        」
                      </p>
                      <p className="text-xs text-stone-600 font-serif-sc leading-relaxed border-l-2 border-[#FF7A50]/40 pl-3">
                        💬 {card.reframe}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-8 animate-soft-pulse text-stone-400">
                  <ChevronDown size={20} />
                </div>
              </div>
            </section>

            {/* ─── 第 4 幕 · 特质光谱 ─── */}
            <section className="snap-start snap-always h-full min-h-dvh flex flex-col items-center justify-center px-8 relative overflow-hidden">
              <div className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full bg-[#C8B8D9]/25 blur-3xl pointer-events-none"></div>
              <div className="w-full max-w-[320px] flex flex-col items-center">
                <p className="text-[11px] tracking-[0.3em] text-[#78649E] mb-6">🌌 {viewMonth}月特质光谱</p>
                <div className="space-y-3 w-full">
                  {traitSpectrum.slice(0, 3).map((t) => (
                    <div key={t.title} className="flex items-center justify-between">
                      <span className="text-sm text-stone-700 font-serif-sc">{t.title}</span>
                      <span className="text-[#FFD166] tracking-tight text-xs">
                        {"★".repeat(t.stars)}
                        <span className="text-stone-200">{"★".repeat(Math.max(0, 5 - t.stars))}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 animate-soft-pulse text-stone-400">
                  <ChevronDown size={20} />
                </div>
              </div>
            </section>

            {/* ─── 第 5 幕 · 月影信件 + 完成 ─── */}
            <section className="snap-start snap-always h-full min-h-dvh flex flex-col items-center justify-center px-8 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-[#FF7A50]/10 blur-3xl pointer-events-none"></div>
              <div className="w-full max-w-[320px] flex flex-col items-center">
                <p className="text-[11px] tracking-[0.3em] text-[#78649E] mb-6">💌 给你的月影信件</p>
                <p className="text-sm text-stone-700 font-serif-sc leading-relaxed text-center">
                  “允许自己手抖，允许自己犹豫。
                  <br />
                  所有的内耗，不过是你的灵魂在认真对待这个世界。”
                </p>
                <button
                  onClick={handleSaveSummaryCard}
                  id="save-monthly-summary-btn"
                  className={`mt-8 w-full py-2.5 rounded-2xl text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.01] active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                    summarySaved ? "bg-emerald-500" : "bg-[#FF7A50] hover:bg-[#FA6400]"
                  }`}
                >
                  {summarySaved ? <Check size={14} /> : <Share2 size={14} />}
                  <span>{summarySaved ? "已生成并保存月度总结卡片" : "生成并保存月度总结卡片"}</span>
                </button>
                <button
                  onClick={() => setIsMonthlySummaryOpen(false)}
                  className="mt-3 text-[11px] text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                >
                  关闭
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. 搜索浮层：点击搜索图标从底部上滑，匹配原话或夸夸内容
          ───────────────────────────────────────────────────────────── */}
      {isSearchOpen && (
        <div className="h5-fullscreen z-50 bg-[#F8F9FC] flex flex-col animate-slide-up">
          {/* 顶栏：返回 + 搜索框 + 取消 */}
          <div className="px-4 py-3 glass-header flex items-center gap-2 sticky top-0 z-10">
            <button
              onClick={closeSearch}
              className="p-1.5 -ml-1.5 rounded-full text-stone-600 hover:bg-white/80 transition-colors cursor-pointer"
              title="返回"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索原话或夸夸内容…"
                autoFocus
                className="w-full pl-9 pr-8 py-2 text-xs rounded-full glass-card-subtle text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#C8B8D9] focus:bg-white transition-all shadow-2xs"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              onClick={closeSearch}
              className="text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer shrink-0"
            >
              取消
            </button>
          </div>

          {/* 结果区 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {searchQuery.trim() === "" ? (
              <div className="text-center text-xs text-stone-400 py-10 font-serif-sc leading-relaxed">
                输入关键词，搜索你留下的原话与夸夸
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-8 text-center glass-card rounded-3xl text-stone-400 text-xs">
                没有找到相关的夸夸记录
              </div>
            ) : (
              <>
                <div className="px-1 text-[10px] text-stone-400">找到 {searchResults.length} 条相关记录</div>
                {searchResults.map((moment) => (
                  <div
                    key={moment.id}
                    className="glass-card glass-card-hover rounded-3xl p-4 text-stone-800 space-y-2.5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-stone-400">{moment.createdAt}</span>
                      {moment.themeTitle && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full glass-card-subtle text-[#78649E] font-medium">
                          {moment.themeTitle}
                        </span>
                      )}
                    </div>

                    {moment.content && (
                      <div className="rounded-2xl p-3 glass-card-strong border border-stone-200/60">
                        <p className="text-xs font-medium text-stone-900 leading-relaxed font-serif-sc">
                          「{moment.content}」
                        </p>
                      </div>
                    )}

                    {moment.response && (
                      <div className="pl-3 border-l-2 border-[#FF7A50]/50 py-0.5">
                        <p className="text-xs text-stone-600 leading-relaxed">{moment.response}</p>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
