import React, { useState } from "react"
import { UserProfile, Moment, Praise, Theme, DiscoveredTrait } from "./types"
import {
  INITIAL_USER,
  INITIAL_MOMENTS,
  INITIAL_DAILY_PRAISE,
  INITIAL_MIRROR_PRAISE,
  INITIAL_THEMES,
  DISCOVERY_POOL,
  INITIAL_DAILY_REVIEW,
  INITIAL_WEEKLY_REVIEW,
} from "./data/mockData"
import { Navbar } from "./components/Navbar"
import { PresentTab } from "./components/PresentTab"
import { GrowthTab } from "./components/GrowthTab"
import { ReviewTab } from "./components/ReviewTab"
import { ProfileTab } from "./components/ProfileTab"
import { ChatModal } from "./components/ChatModal"
import { Onboarding } from "./components/Onboarding"
import { LoginModal } from "./components/LoginModal"
import { H5AppFrame } from "./components/H5AppFrame"
import { virtualMilestoneResponse } from "./lib/virtualData"
import { useAppUiStore } from "./store/useAppUiStore"

export default function App() {
  // Main State
  const [user, setUser] = useState<UserProfile>(INITIAL_USER)
  const [moments, setMoments] = useState<Moment[]>(INITIAL_MOMENTS)
  const [themes, setThemes] = useState<Theme[]>(INITIAL_THEMES)
  const [dailyPraise, setDailyPraise] = useState<Praise>(INITIAL_DAILY_PRAISE)
  const [mirrorPraise, setMirrorPraise] = useState<Praise>(INITIAL_MIRROR_PRAISE)
  // ✨ 新的可能：镜子从历史记录中发现的优势特质（候选 + 已认领）
  const [discoveredTraits, setDiscoveredTraits] = useState<DiscoveredTrait[]>(DISCOVERY_POOL)
  const [traitSkipIds, setTraitSkipIds] = useState<string[]>([])
  // 当日已认领「我发现的自己」的日期（跨会话持久化：每天最多认领一个）
  const [traitClaimedDate, setTraitClaimedDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("kuakua_trait_claimed_date")
      return saved || ""
    } catch {
      return ""
    }
  })
  const getTodayKey = () => new Date().toLocaleDateString("sv") // 本地日期 YYYY-MM-DD
  const [dailyReview, setDailyReview] = useState(INITIAL_DAILY_REVIEW)
  const [weeklyReview, setWeeklyReview] = useState(INITIAL_WEEKLY_REVIEW)

  const {
    activeTab,
    setActiveTab,
    isProfileOpen,
    setIsProfileOpen,
    isOnboardingOpen,
    setIsOnboardingOpen,
    isLoginOpen,
    setIsLoginOpen,
  } = useAppUiStore()

  // Toggle mirror connection state (Hardware simulator)
  const handleToggleMirror = () => {
    setUser((prev) => ({
      ...prev,
      isMirrorConnected: !prev.isMirrorConnected,
    }))
  }

  // Toggle like on a moment
  const handleToggleLikeMoment = (momentId: string) => {
    setMoments((prev) => prev.map((m) => (m.id === momentId ? { ...m, liked: !m.liked } : m)))
  }

  // Toggle like on praises
  const handleToggleLikeDailyPraise = () => {
    setDailyPraise((prev) => ({ ...prev, liked: !prev.liked }))
  }

  const handleToggleLikeMirrorPraise = () => {
    setMirrorPraise((prev) => ({ ...prev, liked: !prev.liked }))
  }

  // Save new Moment from conversation or milestone
  const handleSaveMoment = (newMomentData: Partial<Moment>) => {
    const newMoment: Moment = {
      id: `m_${Date.now()}`,
      userId: user.id,
      kind: newMomentData.kind || "conversation",
      content: newMomentData.content || "",
      response: newMomentData.response || "",
      photoUrl: newMomentData.photoUrl,
      themeId: newMomentData.themeId,
      themeTitle: newMomentData.themeTitle,
      milestoneId: newMomentData.milestoneId,
      difficultyScore: newMomentData.difficultyScore,
      liked: true,
      createdAt: "刚刚",
    }

    setMoments((prev) => [newMoment, ...prev])

    // Also update daily review user quotes
    if (newMoment.content) {
      setDailyReview((prev) => ({
        ...prev,
        userQuotes: [
          {
            text: newMoment.content,
            response: newMoment.response,
            themeTitle: newMoment.themeTitle,
          },
          ...prev.userQuotes,
        ],
      }))
    }
  }

  // 取消喜欢时移除已沉淀的夸夸记录
  const handleRemoveMoment = (criteria: { content: string; response: string }) => {
    setMoments((prev) => prev.filter((m) => !(m.content === criteria.content && m.response === criteria.response)))
  }

  // 开启一个锁定主题（支持用户选择话题）
  const handleOpenTheme = (themeId: string) => {
    setThemes((prev) =>
      prev.map((t) => {
        if (t.id !== themeId) return t
        return {
          ...t,
          isUnlocked: true,
          isActive: true,
          currentMilestoneOrder: 1,
          milestones: t.milestones.map((m) => (m.order === 1 ? { ...m, status: "in_progress" as const } : m)),
        }
      })
    )
  }

  // 恢复被「先放一放」暂停的里程碑
  const handleResumeMilestone = (milestoneId: string) => {
    setThemes((prev) =>
      prev.map((t) => ({
        ...t,
        milestones: t.milestones.map((m) => (m.id === milestoneId ? { ...m, status: "in_progress" as const } : m)),
      }))
    )
  }

  // Complete milestone handler (calls API for AI response)
  const handleCompleteMilestone = async (
    milestoneId: string,
    evidenceText: string,
    evidencePhoto?: string,
    difficultyScore?: number
  ): Promise<string> => {
    let aiResponse = "看见你真切地迈出了这一步，带着哪怕微颤的声音也去试了，这就是最好的成长印记。"

    const activeTheme = themes.find((t) => t.milestones.some((m) => m.id === milestoneId))

    try {
      // 虚拟数据引擎：固定文案（无后端、无网络依赖）
      const data = { response: virtualMilestoneResponse() }
      if (data.response) {
        aiResponse = data.response
      }
    } catch (e) {
      console.error(e)
    }

    // Update milestone state in theme: 完成当前 + 自动解锁下一里程碑
    setThemes((prev) =>
      prev.map((t) => {
        const completed = t.milestones.find((m) => m.id === milestoneId)
        if (!completed) return t
        const nextPending = t.milestones.find((m) => m.order === completed.order + 1 && m.status === "pending")
        return {
          ...t,
          currentMilestoneOrder: Math.max(t.currentMilestoneOrder, completed.order + 1),
          milestones: t.milestones.map((m) => {
            if (m.id === milestoneId) {
              return {
                ...m,
                status: "completed",
                completedAt: "刚刚",
                evidenceText,
                evidencePhoto,
                userScore: difficultyScore,
              }
            }
            if (nextPending && m.id === nextPending.id) {
              return { ...m, status: "in_progress" }
            }
            return m
          }),
        }
      })
    )

    // Save as a Moment (PRD Section 5.5)
    handleSaveMoment({
      kind: "milestone",
      content: evidenceText,
      response: aiResponse,
      photoUrl: evidencePhoto,
      themeId: activeTheme?.id,
      themeTitle: activeTheme?.name,
      milestoneId,
      difficultyScore,
      source: "milestone",
    })

    return aiResponse
  }

  // Pause milestone
  const handlePauseMilestone = (milestoneId: string) => {
    setThemes((prev) =>
      prev.map((t) => ({
        ...t,
        milestones: t.milestones.map((m) => (m.id === milestoneId ? { ...m, status: "paused" } : m)),
      }))
    )
  }

  // ✨ 新的可能：认领/收藏这一面（加入【我发现的自己】）
  const handleClaimTrait = (traitId: string) => {
    setDiscoveredTraits((prev) => prev.map((t) => (t.id === traitId ? { ...t, claimed: true, claimedAt: "刚刚" } : t)))
    // 当天已认领一个，之后当天不再推送新的候选
    const today = getTodayKey()
    setTraitClaimedDate(today)
    try {
      localStorage.setItem("kuakua_trait_claimed_date", today)
    } catch {
      // 本地缓存不可用时仅内存生效
    }
  }

  // 换一个看看（跳过当前候选，未来可再次出现）
  const handleSkipTrait = (traitId: string) => {
    setTraitSkipIds((prev) => [...prev, traitId])
  }

  // Onboarding completion
  const handleOnboardingComplete = (updatedProfile: Partial<UserProfile>, freeThought: string) => {
    setUser((prev) => ({ ...prev, ...updatedProfile }))
    setIsOnboardingOpen(false)

    // 进入登录/注册页（新用户完整路径：Onboarding → 登录 → 首页）
    setIsLoginOpen(true)

    // 首条专属夸夸：有原话则引用原话；未填写时用一条默认夸夸（不编造用户说过的话）
    const hasFreeThought = Boolean(freeThought && freeThought.trim())
    const praiseContent = hasFreeThought
      ? `你刚说“${freeThought}”。把那些在心里绕着的不安坦白地讲出来，就已经说明你把“想被理解”从想法变成了动作。我记住了，今天我会一直在你身边。`
      : `今天你来到了夸夸镜前，愿意停下来看看自己，这本身就是一种温柔。我记住了你的名字，从今天起，我会一直在你身边，慢慢陪你成为想成为的自己。`
    setDailyPraise({
      id: `p_daily_${Date.now()}`,
      userId: user.id,
      content: praiseContent,
      shortContent: hasFreeThought ? "把心里绕着的不安，变成了真实的沟通。" : "愿意停下来看看自己，就是一种温柔。",
      source: "app_daily",
      liked: false,
      createdAt: "今天",
    })

    if (hasFreeThought) {
      // 首条夸夸落地为 Moment：Step 3 原话 + Step 4 专属夸夸（出现在此刻与回顾列表中）
      const firstPraiseMoment: Moment = {
        id: `m_first_${Date.now()}`,
        userId: user.id,
        kind: "conversation",
        content: freeThought,
        response: praiseContent,
        liked: true,
        isFirstPraise: true,
        source: "chat",
        createdAt: "刚刚",
      }
      setMoments((prev) => [firstPraiseMoment, ...prev])
    }
  }

  // 数据绑定当前设备本地缓存（云端同步预留）
  const persistLocalData = (mode: "account" | "guest", method?: "phone" | "email", account?: string) => {
    try {
      localStorage.setItem(
        "kuakua_session",
        JSON.stringify({
          mode,
          method,
          account,
          loggedInAt: new Date().toISOString(),
          cloudSyncReserved: true,
        })
      )
      localStorage.setItem("kuakua_local_data", JSON.stringify({ user, moments, savedAt: new Date().toISOString() }))
    } catch (e) {
      console.error("本地缓存写入失败", e)
    }
  }

  // 登录/注册成功（Demo：任意输入均成功）
  const handleLoginComplete = (method: "phone" | "email", account: string) => {
    persistLocalData("account", method, account)
    setIsLoginOpen(false)
  }

  // 跳过登录：以游客身份进入首页（数据存本地）
  const handleLoginSkip = () => {
    persistLocalData("guest")
    setIsLoginOpen(false)
  }

  // 退出登录：清除本机会话缓存，回到新手引导重新开始（数据仍保留在本机）
  const handleLogout = () => {
    try {
      localStorage.removeItem("kuakua_session")
    } catch (e) {
      console.error("清除会话缓存失败", e)
    }
    setUser(INITIAL_USER)
    setIsProfileOpen(false)
    setActiveTab("present")
    setIsOnboardingOpen(true)
    setIsLoginOpen(false)
  }

  // 已有账号：从 Onboarding 快进到登录/注册页
  const handleSkipToLogin = () => {
    setIsOnboardingOpen(false)
    setIsLoginOpen(true)
  }

  const navigation = <Navbar />

  const overlays = (
    <>
      <ChatModal
        user={user}
        moments={moments}
        themes={themes}
        onSaveMoment={handleSaveMoment}
        onRemoveMoment={handleRemoveMoment}
      />

      {isProfileOpen && (
        <ProfileTab
          user={user}
          onUpdateUserProfile={(updated) => setUser((prev) => ({ ...prev, ...updated }))}
          onResetOnboarding={() => {
            setIsProfileOpen(false)
            setIsOnboardingOpen(true)
          }}
          onToggleMirror={handleToggleMirror}
          onLogout={handleLogout}
          onClose={() => setIsProfileOpen(false)}
        />
      )}

      {isOnboardingOpen && <Onboarding onComplete={handleOnboardingComplete} onSkipToLogin={handleSkipToLogin} />}

      {isLoginOpen && <LoginModal onLogin={handleLoginComplete} onSkip={handleLoginSkip} />}
    </>
  )

  return (
    <H5AppFrame navigation={navigation} overlays={overlays}>
      {/* Main Tab Views (顶部栏已内嵌于「此刻」页) */}
      {activeTab === "present" && (
        <PresentTab
          user={user}
          moments={moments}
          themes={themes}
          dailyPraise={dailyPraise}
          mirrorPraise={user.isMirrorConnected ? mirrorPraise : undefined}
          onToggleLikeMoment={handleToggleLikeMoment}
          onToggleLikeDailyPraise={handleToggleLikeDailyPraise}
          onToggleLikeMirrorPraise={handleToggleLikeMirrorPraise}
          onSaveMoment={handleSaveMoment}
          onUpdateUser={(updated) => setUser((prev) => ({ ...prev, ...updated }))}
        />
      )}

      {activeTab === "growth" && (
        <GrowthTab
          user={user}
          themes={themes}
          moments={moments}
          traitCandidate={
            // 每天最多认领一个：当天已认领过，或跨天后日期不同，都不再推送候选
            traitClaimedDate === getTodayKey()
              ? null
              : discoveredTraits.find((t) => !t.claimed && !traitSkipIds.includes(t.id)) || null
          }
          claimedTraits={discoveredTraits.filter((t) => t.claimed)}
          onClaimTrait={handleClaimTrait}
          onSkipTrait={handleSkipTrait}
          onCompleteMilestone={handleCompleteMilestone}
          onPauseMilestone={handlePauseMilestone}
          onResumeMilestone={handleResumeMilestone}
          onOpenTheme={handleOpenTheme}
        />
      )}

      {activeTab === "review" && (
        <ReviewTab
          dailyReview={dailyReview}
          weeklyReview={weeklyReview}
          moments={moments}
          user={user}
          onToggleLikeMoment={handleToggleLikeMoment}
        />
      )}
    </H5AppFrame>
  )
}
