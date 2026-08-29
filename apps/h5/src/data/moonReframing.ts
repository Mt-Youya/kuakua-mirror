import { Moment, UserProfile, MoonFlipCard } from "../types"

// 🌙 月亮另一面：把本月内耗记录重构为天赋
// 纯本地生成，无 API key 也能完整演示（演示确定性，且符合"不考核、非评判"铁律）

// 负面词（语义冲突命中）：content 含任一词即视为"内耗/自我否定"表达
const NEGATIVE_PATTERNS = [
  "不敢",
  "害怕",
  "讨厌自己",
  "觉得自己很差",
  "不够好",
  "是不是我不行",
  "累",
  "硬撑",
  "被掏空",
  "全盘皆输",
  "做不好",
  "失败",
  "拖后腿",
  "帮不上",
  "不行",
  "后悔",
  "犹豫",
  "焦虑",
  "内耗",
  "压力",
  "自责",
  "烦",
  "难过",
  "没做好",
  "没资格",
  "比不上",
  "不配",
]

// 天赋词映射表：key 为命中特征（负面词或标签），value 为"天赋词 + 解读"
// 风格沿用 DISCOVERY_POOL（"带着颤音的勇敢"式命名 + "你不是拖延，你只是…"式认知重构）
const REFRAMING_MAP: { match: string[]; traitTitle: string; reframe: string }[] = [
  {
    match: ["不敢", "犹豫", "发言", "开会", "举手", "表达"],
    traitTitle: "带着颤音的勇敢",
    reframe: "你不是怯场，你只是把每一次开口都看得郑重。勇气和紧张在你身上可以同时发生，而你还是开口了。",
  },
  {
    match: ["害怕", "觉得自己很差", "是不是我不行", "不配", "比不上"],
    traitTitle: "先怀疑自己的敏锐",
    reframe: "你不是自我否定，你是对自己有极高的标准，又生怕辜负它。可你能把这份不安说出来，本身就是敢直面自己的证据。",
  },
  {
    match: ["不够好", "没做好", "失败", "全盘皆输", "做不好"],
    traitTitle: "对卓越的敬畏",
    reframe:
      '你不是拖延，也不是差劲，你只是对出手的品质有极高的要求。把"方案需要补充"和"我不行"分开，就是你已经在放手的地方。',
  },
  {
    match: ["累", "硬撑", "被掏空", "没休息过"],
    traitTitle: "温柔承重的托底者",
    reframe:
      '你不是撑不住，你是把别人的感受放在了很靠前的位置。可你也在慢慢学会分辨"我想去"和"我该去"，这就是自我呵护的开始。',
  },
  {
    match: ["拒绝", "不想去", "讨好", "答应"],
    traitTitle: "温柔的边界感",
    reframe: '你不是不敢拒绝，你只是不习惯让人失望。当你终于把"我累了"说出口，那不是伤害关系，是开始照顾自己。',
  },
  {
    match: ["完美主义", "拖延", "自责"],
    traitTitle: "细节里的守夜人",
    reframe: '你不是拖延，你不允许自己潦草地交付。这份"要把它做好"的心，正是你对自己作品和承诺的敬意。',
  },
  {
    match: [
      "展示焦虑",
      "社交疲惫",
      "外貌焦虑",
      "冒名顶替感",
      "做决定内耗",
      "过分在意他人评价",
      "害怕冲突",
      "习惯性自我怀疑",
    ],
    traitTitle: "看得见每一束目光的敏感",
    reframe: "你不是玻璃心，你是把周围的一切都感受得很真切。这份敏感让你累，但也让你比谁都懂人、懂气氛、懂分寸。",
  },
]

// 通用兜底：未命中任何映射时的温柔重构
const GENERIC_REFRAME: { traitTitle: string; reframe: string }[] = [
  {
    traitTitle: "深夜还在思考的心",
    reframe: "你愿意把这件事放在心上反复想，说明你在乎它。在乎不是负担，是你认真生活的证据。",
  },
  {
    traitTitle: "尚未命名的力量",
    reframe: "有些感受暂时说不出名字，不代表它没有分量。你把它留在了这里，就已经是很好的开始。",
  },
  { traitTitle: "安静生长的坚持", reframe: "你不是在困住自己，你只是在找一个更妥帖的出口。慢慢来，你已经走了一段路。" },
]

// 命中用户内耗标签（标签名需出现在 themeTitle 中，如"展示焦虑"）
function hitsConcernTag(moment: Moment, concernTags: string[]): boolean {
  if (!moment.themeTitle) return false
  return concernTags.some((tag) => moment.themeTitle.includes(tag))
}

function hitsNegative(content: string): boolean {
  return NEGATIVE_PATTERNS.some((w) => content.includes(w))
}

// 权重计算：语义冲突 > 标签命中 > 高难度；同权重下难度高者优先
function scoreMoment(moment: Moment, concernTags: string[]): number {
  let score = 0
  if (hitsNegative(moment.content)) score += 30
  if (hitsConcernTag(moment, concernTags)) score += 20
  if ((moment.difficultyScore ?? 0) >= 3) score += 10 + Math.min(moment.difficultyScore ?? 0, 5)
  return score
}

function pickReframe(
  content: string,
  tag?: string,
  usedTitles: string[] = []
): { traitTitle: string; reframe: string } {
  // 同一批卡里避免出现重复天赋词：已用过的标题跳过
  for (const entry of REFRAMING_MAP) {
    if (tag && entry.match.includes(tag) && !usedTitles.includes(entry.traitTitle)) {
      return { traitTitle: entry.traitTitle, reframe: entry.reframe }
    }
  }
  for (const entry of REFRAMING_MAP) {
    if (entry.match.some((w) => content.includes(w)) && !usedTitles.includes(entry.traitTitle)) {
      return { traitTitle: entry.traitTitle, reframe: entry.reframe }
    }
  }
  const pool = GENERIC_REFRAME.filter((g) => !usedTitles.includes(g.traitTitle))
  const candidates = pool.length > 0 ? pool : GENERIC_REFRAME
  const generic = candidates[Math.floor(Math.random() * candidates.length)]
  return generic
}

// 生成本月「月亮另一面」卡片：最多 3 张，记录不足则有几条算几条
export function buildMoonFlipCards(
  monthMoments: Moment[],
  user?: Pick<UserProfile, "innerConcernTags">
): MoonFlipCard[] {
  const concernTags = user?.innerConcernTags || []

  // 只取有原话的记录（content 非空，排除纯硬件夸夸）
  const candidates = monthMoments.filter((m) => (m.content || "").trim() !== "")

  // 全部无有效原话 → 降级（返回空数组，由组件展示默认温柔寄语）
  if (candidates.length === 0) return []

  const ranked = [...candidates].map((m) => ({ m, s: scoreMoment(m, concernTags) })).sort((a, b) => b.s - a.s)

  const top = ranked.slice(0, 3)

  const usedTitles: string[] = []
  return top.map(({ m }, idx) => {
    const { traitTitle, reframe } = pickReframe(m.content, m.themeTitle, usedTitles)
    usedTitles.push(traitTitle)
    return {
      id: `moon_${m.id}_${idx}`,
      original: m.content,
      date: m.createdAt || "",
      tag: m.themeTitle,
      difficultyScore: m.difficultyScore,
      traitTitle,
      reframe,
      sourceMomentId: m.id,
    }
  })
}
