export type PersonaId = "warm_support" | "bold_breaker" | "humorous_deconstruct" | "custom"

export type PraiseStyle = "热烈 + 肯定" | "含蓄 + 温润" | "理性 + 拆解"

export interface UserProfile {
  id: string
  nickname: string
  avatar: string
  mbti: string
  idealSelf: string
  personaId: PersonaId
  customPersonaDesc?: string
  praiseStyle: PraiseStyle
  innerConcernTags: string[]
  freeDescription?: string
  onboardingDone: boolean
  isMirrorConnected: boolean
  daysActiveThisMonth: number
}

export type MomentKind = "conversation" | "milestone" | "hardware"

// 记录来源：对话/想聊聊沉淀、里程碑、硬件镜面
export type MomentSource = "chat" | "milestone" | "hardware"

export interface Moment {
  id: string
  userId: string
  kind: MomentKind
  content: string // User original words (or empty for pure mirror praise)
  response: string // AI response / Mirror praise
  photoUrl?: string // Optional evidence photo from user for milestones (non-facial, safe)
  themeId?: string
  themeTitle?: string
  milestoneId?: string
  conversationId?: string
  difficultyScore?: number // 1-5 self-evaluated score, optional / skippable
  isFirstPraise?: boolean // 初次相遇时生成的首条专属夸夸
  source?: MomentSource // 来源标记：'chat'（想聊聊沉淀）/ 'milestone' / 'hardware'
  liked: boolean
  createdAt: string // ISO date or formatted
}

export interface Praise {
  id: string
  userId: string
  momentId?: string
  content: string // 50-120 words
  shortContent?: string // <= 20 words for mirror
  source: "hardware" | "app_daily"
  liked: boolean
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: "user" | "ai"
  content: string
  turnIndex: number
  safetyFlagged?: boolean
  timestamp: string
  momentSaved?: boolean
}

export interface Milestone {
  id: string
  themeId: string
  order: number // 1-7
  title: string
  description: string
  guidingQuestion: string
  taskDescription: string
  encouragementText: string
  status: "pending" | "in_progress" | "completed" | "paused" | "stalled"
  completedAt?: string
  evidenceText?: string
  evidencePhoto?: string
  userScore?: number
}

export interface Theme {
  id: string
  name: string
  tagline: string
  description: string
  isUnlocked: boolean
  isActive?: boolean // 活跃成长线（显示在「现在面对的」）
  isFree?: boolean // 由「新的可能」洞察生成的主题
  currentMilestoneOrder: number
  totalMilestones: number
  guideContent: {
    caresAbout: string
    whatIsProgress: string
    forbiddenPhrases: string
  }
  milestones: Milestone[]
  userQuotes: {
    date: string
    quote: string
  }[]
}

export interface NewPossibilityCard {
  id: string
  quote1: { date: string; text: string }
  quote2: { date: string; text: string }
  insight: string
  suggestedTheme: string
  status: "pending" | "accepted" | "paused_30d" | "muted"
  pausedUntil?: string // 「暂时不」时暂存的 30 天后再现时间戳（ISO）
}

// ✨ 新的可能：镜子从历史记录中发现的优势/特质
export interface DiscoveredTrait {
  id: string
  title: string // 特质名（如"带着颤音的勇敢"）
  description: string // 换一个角度的解读（"原来我是这样"）
  evidence: { date: string; quote: string }[] // 历史记录证据
  claimed: boolean // 是否已被用户认领/收藏
  claimedAt?: string
  validatedCount?: number // 未来被新记录继续验证的次数（预留）
}

// 🌙 月亮另一面：把本月内耗记录重构为天赋的翻转卡
export interface MoonFlipCard {
  id: string
  original: string // 用户原话（暗月正面引用）
  date: string // 记录日期（如 8月26日）
  tag?: string // 内耗标签（如有）
  difficultyScore?: number // 用户自评难度（如有）
  traitTitle: string // 天赋词（亮月背面，如"对卓越的敬畏"）
  reframe: string // 认知重构解读
  sourceMomentId?: string // 来源记录 id
}

export interface DailyReviewData {
  id: string
  date: string
  dateFormatted: string
  moodSummary: string
  userQuotes: {
    text: string
    response: string
    themeTitle?: string
  }[]
  shiningMoment: string
  difficultyData: {
    topic: string
    points: { date: string; score: number }[]
    comparisonText: string
  }
  currentMilestoneProgress: {
    themeName: string
    milestoneTitle: string
    order: number
  }
}

export interface WeeklyReviewData {
  id: string
  weekLabel: string
  caredAboutThemes: string[]
  referencedQuotes: { date: string; text: string }[]
  whatBecameEasier: {
    topic: string
    beforeText: string
    afterText: string
    beforeScore: number
    afterScore: number
  }
  gentleSuggestion: string
  frozen: boolean
}
