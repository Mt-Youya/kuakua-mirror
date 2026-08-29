import React, { useState } from "react"
import { Sparkles, ArrowRight, Check, Heart, Shield, HelpCircle } from "lucide-react"
import { UserProfile, PersonaId } from "../types"
import { PERSONAS, MBTI_OPTIONS, CONCERN_TAGS, PERSONA_PRAISE_STYLE } from "../data/personas"

interface OnboardingProps {
  onComplete: (userProfile: Partial<UserProfile>, freeThought: string) => void
  onSkipToLogin: () => void // 已有账号：快进到登录/注册页
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onSkipToLogin }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)

  // Step 0 State（名字）
  const [nickname, setNickname] = useState("")

  // Step 1 State
  const [selectedPersonaId, setSelectedPersonaId] = useState<PersonaId>("warm_support")
  const [selectedMBTI, setSelectedMBTI] = useState("INFP")
  const [idealSelf, setIdealSelf] = useState("不用等到准备好，也能开口的那个人")

  // Step 2 State
  const [selectedTags, setSelectedTags] = useState<string[]>(["展示焦虑", "完美主义"])

  // Step 3 State
  const [freeDescription, setFreeDescription] = useState("每次在会议上想发言都犹豫很久，害怕别人觉得我很幼稚")

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      if (selectedTags.length > 1) {
        setSelectedTags(selectedTags.filter((t) => t !== tag))
      }
    } else {
      if (selectedTags.length < 4) {
        setSelectedTags([...selectedTags, tag])
      }
    }
  }

  const handleFinish = () => {
    onComplete(
      {
        nickname: nickname.trim() || "我",
        personaId: selectedPersonaId,
        mbti: selectedMBTI,
        idealSelf: idealSelf.trim() || "不用等到准备好，也能开口的那个人",
        innerConcernTags: selectedTags,
        praiseStyle: PERSONA_PRAISE_STYLE[selectedPersonaId],
        freeDescription: freeDescription.trim(),
        onboardingDone: true,
      },
      freeDescription.trim()
    )
  }

  return (
    <div className="h5-fullscreen z-50 bg-[#F8F9FC] bg-hero-glow flex flex-col justify-between p-5 overflow-y-auto animate-fade-in">
      {/* Top progress indicator */}
      <div className="pt-2 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF7A50]">
            <Sparkles size={14} />
            <span>夸夸镜 · 初次相遇</span>
          </div>
          <span className="text-[11px] text-stone-400 font-medium">步骤 {step} / 5</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-stone-200/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FF8A65] to-[#FF7A50] transition-all duration-300 rounded-full"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Content by Step */}
      <div className="flex-1 flex flex-col justify-center py-2">
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-serif-sc mb-1">该怎么称呼你？</h2>
              <p className="text-xs text-stone-500">
                在夸夸镜前，先让我们认识你的名字——之后的每一句夸夸，都会叫着它说给你听。
              </p>
            </div>

            <div>
              <label className="text-[11px] font-medium text-stone-600 mb-1 block">你的名字 / 昵称</label>
              <input
                id="onboarding-nickname-input"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="例如：嘉欣、小鹿、阿澈…"
                maxLength={12}
                className="w-full text-xs p-3 rounded-2xl glass-card-subtle focus:border-[#FF7A50] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A50]/20 transition-all"
              />
              <p className="text-[10px] text-stone-400 mt-1.5">之后可以在「我」页面随时修改</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-serif-sc mb-1">你想成为什么样的自己？</h2>
              <p className="text-xs text-stone-500">同一个“想成为的我”，在镜子前夸你一句，在APP里陪你说话。</p>
              <p className="text-[11px] text-stone-400 font-serif-sc mt-2">
                💡 选定的人格会自动匹配说话风格（托底者·含蓄温润，破局者/解构者·热烈肯定），之后可在「我」中调整
              </p>
            </div>

            {/* Persona Cards */}
            <div className="grid grid-cols-2 gap-2">
              {PERSONAS.map((p) => {
                const isSelected = selectedPersonaId === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPersonaId(p.id)}
                    className={`p-3 rounded-2xl text-left border transition-all shadow-2xs ${
                      isSelected
                        ? "glass-card-strong border-[#FF8A65] ring-2 ring-[#FF7A50]/20"
                        : "glass-card-subtle text-stone-700 hover:text-stone-900"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base">{p.avatarIcon}</span>
                      {isSelected && <Check size={14} className="text-[#FF7A50]" />}
                    </div>
                    <p className="text-xs font-bold text-stone-800">{p.name}</p>
                    <p className="text-[10px] text-stone-400 line-clamp-1 mt-0.5">{p.tagline}</p>
                  </button>
                )
              })}
            </div>

            {/* Ideal Self Input */}
            <div>
              <label className="text-[11px] font-medium text-stone-600 mb-1 block">
                理想中的自己是什么样子？（只是想更了解你）
              </label>
              <input
                type="text"
                value={idealSelf}
                onChange={(e) => setIdealSelf(e.target.value)}
                placeholder="例如：不用等到准备好，也能开口的那个人"
                className="w-full text-xs p-3 rounded-2xl glass-card-subtle focus:border-[#FF7A50] focus:bg-white focus:outline-none transition-all"
              />
            </div>

            {/* MBTI Select */}
            <div>
              <label className="text-[11px] font-medium text-stone-600 mb-1.5 block">
                MBTI 性格类型（只是想更了解你，不会用标签定义你）：
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {MBTI_OPTIONS.map((m) => (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => setSelectedMBTI(m.code)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-medium border text-center transition-all shadow-2xs ${
                      selectedMBTI === m.code
                        ? "bg-emerald-50/90 border-emerald-300 text-[#2B7A68] font-bold"
                        : "glass-card-subtle text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {m.code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-serif-sc mb-1">哪些事情最容易让你内耗？</h2>
              <p className="text-xs text-stone-500">请选择 2-3 个你最在意的标签，我们将为你优先匹配成长主题。</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {CONCERN_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-3.5 py-2 rounded-2xl border transition-all flex items-center gap-1.5 shadow-2xs ${
                      isSelected
                        ? "glass-card-strong border-[#C8B8D9] text-[#55407A] font-semibold ring-2 ring-[#78649E]/15"
                        : "glass-card-subtle text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <span>{tag}</span>
                    {isSelected && <Check size={12} className="text-[#78649E]" />}
                  </button>
                )
              })}
            </div>

            <p className="text-[11px] text-stone-400 font-serif-sc pt-3">
              已选 {selectedTags.length} 项 · 随时可以在「我」页面调整
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-serif-sc mb-1">最近最困扰你的是什么？</h2>
              <p className="text-xs text-stone-500">
                写下一句你真实经历的小事吧。这是我们第一次照面，我想从这句开始认识你。
              </p>
            </div>

            <div className="p-3.5 rounded-3xl glass-card-strong">
              <textarea
                value={freeDescription}
                onChange={(e) => setFreeDescription(e.target.value)}
                placeholder="例如：每次在周会上想发言都犹豫很久，害怕别人觉得我很幼稚…"
                rows={4}
                className="w-full text-xs text-stone-800 focus:outline-none resize-none leading-relaxed font-serif-sc bg-transparent"
              />
            </div>

            <div className="p-3 rounded-2xl glass-card-subtle text-[11px] text-stone-500 leading-relaxed shadow-2xs">
              💡 <strong>为什么需要这句话？</strong>{" "}
              第一次见面，我想先认真听完你的话，再开口回应你——而不是说一句对谁都一样的漂亮话。
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="text-center space-y-4 py-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#FF8A65] to-[#FF7A50] text-white mx-auto flex items-center justify-center shadow-lg shadow-[#FF7A50]/30 animate-soft-pulse">
              <Heart size={28} className="fill-white" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-stone-900 font-serif-sc mb-2">
                “我记住了。从现在开始，我会在你身边。”
              </h2>
              <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto font-serif-sc">
                无论外面的评价如何，在这里，你每一次微小的尝试和真实的经历，都会被具体地看见与托底。
              </p>
            </div>

            <div className="p-4 rounded-3xl glass-card-strong text-left">
              <span className="text-[10px] text-[#78649E] font-semibold block mb-1">今日首条专属夸夸已生成：</span>
              <p className="text-xs text-stone-700 font-serif-sc leading-relaxed italic">
                “关于你刚才提到的那份顾虑——愿意把心里的不安全感写下来，就已经是打破退缩的第一步了。”
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Button Bar */}
      <div className="pt-4 pb-safe border-t border-stone-200/50">
        {step < 5 ? (
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                className="py-3 px-4 rounded-2xl glass-card-subtle text-stone-600 text-xs font-medium hover:text-stone-900"
              >
                上一步
              </button>
            )}
            <button
              id={`onboarding-next-step-${step}`}
              type="button"
              onClick={() => setStep((step + 1) as any)}
              disabled={step === 1 && !nickname.trim()}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#FF7A50] to-[#FA6400] text-white text-xs font-semibold shadow-md shadow-[#FF7A50]/20 hover:opacity-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:shadow-none"
            >
              <span>{step === 4 ? "完成设定，去见夸夸" : step === 1 ? "记住我了，继续" : "继续下一步"}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <button
            id="onboarding-complete-btn"
            type="button"
            onClick={handleFinish}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FF7A50] to-[#FA6400] text-white text-xs font-bold shadow-lg shadow-[#FF7A50]/30 hover:opacity-95 transition-all"
          >
            去看看今天的夸夸与此刻 →
          </button>
        )}

        {/* 已有账号：快进到登录/注册页（不阻塞引导，随时可退出） */}
        <div className="flex justify-center pt-3">
          <button
            id="onboarding-skip-to-login-btn"
            type="button"
            onClick={onSkipToLogin}
            className="text-[11px] text-stone-400 hover:text-[#FF7A50] transition-colors font-medium cursor-pointer"
          >
            已有账号，去登录 →
          </button>
        </div>
      </div>
    </div>
  )
}
