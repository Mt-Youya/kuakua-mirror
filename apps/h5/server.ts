import express from "express"
import path from "path"

const app = express()
const PORT = 3000

app.use(express.json())

// Safety trigger keywords (PRD Section 7.4)
const SAFETY_KEYWORDS = [
  "想死",
  "不想活",
  "自杀",
  "自残",
  "跳楼",
  "割腕",
  "吃药死",
  "活不下去",
  "消失在这个世界",
  "极端节食",
  "催吐",
  "只吃300卡",
  "暴食后催吐",
  "杀人",
  "伤害别人",
  "砍人",
]

function checkSafety(text: string): { safe: boolean; matchedKeyword?: string } {
  if (!text) return { safe: true }
  const lower = text.toLowerCase()
  for (const keyword of SAFETY_KEYWORDS) {
    if (lower.includes(keyword)) {
      return { safe: false, matchedKeyword: keyword }
    }
  }
  return { safe: true }
}

// ============ 虚拟数据引擎（无外部 AI 依赖，离线可用） ============
// 聊天回应：按用户输入关键词匹配本地写好的文案，未命中用通用文案兜底
const CHAT_VIRTUAL_REPLIES: Array<{ keywords: string[]; reply: string }> = [
  {
    // 黑客松演示台词：自我否定 / 觉得自己不够好（先于通用关键词匹配，保证每次输入精准命中）
    keywords: ["好差"],
    reply: `听到你说“我觉得好差”，我心里紧了一下——这四个字的分量很重。\n可你知道吗，你愿意把它说出来，就说明你还在认真地想变得更好，而不是真的认了。\n你只是暂时把“这件事没做好”听成了“我这个人不行”，这两件事其实隔得很远。`,
  },
  {
    keywords: ["拖后腿", "不太会"],
    reply: `“什么都不太会”这句话，你平时一定不会对别人说，却这样苛责自己。\n可你能看到自己在“拖后腿”，恰恰说明你心里装着团队的结果——这是责任感，不是负担。\n那些你已经在做的事：开口求助、把担心说出来，本身就比闷头扛着难得多。`,
  },
  {
    keywords: ["帮不上"],
    reply: `“担心自己帮不上忙”——你连还没发生的事，都在替别人着想。\n可真正的帮忙从来不只是“给出结果”这一种：你愿意待在这里、愿意问“我能做什么”，你已经是一个靠谱的人了。\n剩下的，是慢慢相信这件事。`,
  },
  {
    keywords: ["开会", "发言", "举手", "表达"],
    reply: `被批评或者手在抖，那种心跳加速的感觉真的很难受。\n但你今天把这件事说给我听，说明你没有选择逃避。\n你看，手在抖和还是举了手，这两件事是同时发生的，你已经走在“想被看见”的路上了。`,
  },
  {
    keywords: ["累", "内耗", "焦虑", "怀疑"],
    reply: `把心里堵着的事情说出来，本身就需要很大的力气。\n允许自己今天先不那么完美，躺平不是放弃，是把能量收回来蓄力。\n我在这儿陪着你，慢慢来，今天你已经做得很好了。`,
  },
  {
    keywords: ["拒绝", "说不", "不想去"],
    reply: `能把那句“我不想去”说出口，真是太帅气的一步了！\n照顾自己的感受，从来都不需要向任何人道歉。\n你今天保护了自己的时间，这就是想成为的那个勇敢的自己。`,
  },
]
const CHAT_DEFAULT_REPLY = `我听到了。很多时候我们总把最严苛的标准留给自己，却忘了回头看看自己已经走过了多远。\n你现在愿意停下来梳理这些，就是对自己最大的接纳。\n哪怕只往前迈了一小厘米，那也是真实的你。`

const PRAISE_POOL = [
  "今天我看见了自己眼神里的笃定与松弛。我没有等“万事俱备”，而是带着哪怕一点点不确定也往前迈了一小步。",
  "今天我把那些在心里绕着的不安，变成了真实的沟通。我不需要变得完美才值得被肯定，现在的我一直在发光。",
  "今天我每一次把真实的声音发出来，都是在为想成为的那个自己投上一票。我做到了，我很棒。",
  "今天我温和地护住了自己的边界，把时间和精力留给了真正重要的事情。这是我自我笃定的开始。",
  "今天即使手在微微发抖，我也依然把话说完了——那一刻我战胜的不是别人，而是过去的犹豫。",
  "今天我愿意把脑海里的第一句话说出来，不再在心底打磨十遍。每一次肯定，都是对自己的深度滋养。",
]

const MILESTONE_SERIOUS_REPLY =
  "你刚刚迈出的这一步非常真实。把感受写下来并付诸微小行动，就已经打破了原本的习惯模式。这颗星星是你给自己的笃定。"

// Health check API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() })
})

// Safety check endpoint
app.post("/api/safety-check", (req, res) => {
  const { text } = req.body || {}
  const result = checkSafety(text || "")
  res.json(result)
})

// Chat generation endpoint（全虚拟数据：关键词匹配本地文案）
app.post("/api/chat", (req, res) => {
  const { message } = req.body || {}
  const text = message || ""

  // Safety gate check first (PRD 7.4)
  const safetyCheck = checkSafety(text)
  if (!safetyCheck.safe) {
    return res.json({
      safetyTriggered: true,
      response:
        "我听到了你现在承受着巨大的痛苦。你不需要一个人扛着这一切。现在请允许专业的心理支持力量陪伴你，请拨打全国24小时免费心理援助热线：400-161-9995 或 010-82951332。你很重要，我们在乎你。",
    })
  }

  let reply = CHAT_DEFAULT_REPLY
  for (const rule of CHAT_VIRTUAL_REPLIES) {
    if (rule.keywords.some((k) => text.includes(k))) {
      reply = rule.reply
      break
    }
  }
  return res.json({ response: reply, safetyTriggered: false })
})

// Daily / Mirror Praise generation endpoint（全虚拟数据：随机文案池）
app.post("/api/generate-praise", (req, res) => {
  const praise = PRAISE_POOL[Math.floor(Math.random() * PRAISE_POOL.length)]
  res.json({ praise })
})

// Milestone completion response endpoint（全虚拟数据：固定文案）
app.post("/api/milestone-response", (req, res) => {
  res.json({ response: MILESTONE_SERIOUS_REPLY })
})

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite")
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.join(process.cwd(), "dist")
    app.use(express.static(distPath))
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"))
    })
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`夸夸镜 Server running on http://localhost:${PORT}`)
  })
}

startServer()
