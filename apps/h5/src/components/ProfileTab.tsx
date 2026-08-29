import React, { useState } from "react"
import {
  ArrowLeft,
  User,
  Sparkles,
  Shield,
  HelpCircle,
  RotateCcw,
  Edit3,
  Check,
  LogOut,
  ToggleLeft,
  ToggleRight,
  Heart,
  Tag,
  Smile,
} from "lucide-react"
import { UserProfile, PersonaId } from "../types"
import { PERSONAS, MBTI_OPTIONS, CONCERN_TAGS, PERSONA_PRAISE_STYLE } from "../data/personas"
import { CompanionDialog } from "./ui/CompanionDialog"

interface ProfileTabProps {
  user: UserProfile
  onUpdateUserProfile: (updated: Partial<UserProfile>) => void
  onResetOnboarding: () => void
  onToggleMirror: () => void
  onLogout: () => void
  onClose: () => void
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  onUpdateUserProfile,
  onResetOnboarding,
  onToggleMirror,
  onLogout,
  onClose,
}) => {
  const [isEditingIdealSelf, setIsEditingIdealSelf] = useState(false)
  const [idealSelfInput, setIdealSelfInput] = useState(user.idealSelf)
  const [isEditingPersona, setIsEditingPersona] = useState(false)
  const [isEditingMBTI, setIsEditingMBTI] = useState(false)
  const [isEditingTags, setIsEditingTags] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)

  const currentPersona = PERSONAS.find((p) => p.id === user.personaId) || PERSONAS[0]

  const handleSaveIdealSelf = () => {
    onUpdateUserProfile({ idealSelf: idealSelfInput.trim() || user.idealSelf })
    setIsEditingIdealSelf(false)
  }

  const handleSelectPersona = (pId: PersonaId) => {
    // 切换人格时，说话风格覆盖为该人格的预设值（手动修改后仍可在下方单独调整）
    onUpdateUserProfile({ personaId: pId, praiseStyle: PERSONA_PRAISE_STYLE[pId] })
    setIsEditingPersona(false)
  }

  const handleSelectMBTI = (mbtiCode: string) => {
    onUpdateUserProfile({ mbti: mbtiCode })
    setIsEditingMBTI(false)
  }

  const toggleConcernTag = (tag: string) => {
    const currentTags = [...user.innerConcernTags]
    const index = currentTags.indexOf(tag)
    if (index > -1) {
      if (currentTags.length > 1) {
        currentTags.splice(index, 1)
      }
    } else {
      currentTags.push(tag)
    }
    onUpdateUserProfile({ innerConcernTags: currentTags })
  }

  return (
    <div className="h5-fullscreen z-40 bg-[#F8F9FC] flex flex-col animate-fade-in overflow-y-auto">
      {/* 顶栏：返回「此刻」（普通流内，不吸顶不遮挡内容） */}
      <div className="px-4 py-3 glass-header flex items-center justify-between">
        <button
          id="profile-back-btn"
          onClick={onClose}
          className="p-1.5 -ml-1.5 rounded-full text-stone-600 hover:bg-white/80 transition-colors flex items-center gap-1 text-xs font-medium"
        >
          <ArrowLeft size={18} />
          <span>此刻</span>
        </button>
        <span className="text-xs font-semibold text-stone-800">我</span>
        <div className="w-12"></div>
      </div>

      <div className="flex-1 px-4 pt-2 pb-10 space-y-4">
        {/* Profile Header */}
        <div className="p-4 rounded-3xl glass-card-strong flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/90 shadow-2xs shrink-0">
            <img
              src={user.avatar}
              alt={user.nickname}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-stone-900 truncate">{user.nickname}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full glass-card-subtle text-[#78649E] font-medium">
                {user.mbti} · {currentPersona.name}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 truncate mt-0.5">
              本月陪伴：已主动倾诉 {user.daysActiveThisMonth} 天
            </p>
          </div>
        </div>

        {/* 1. ── 我想成为的自己 ── (PRD Section 4.6 最强的方向指南) */}
        <div className="p-4 rounded-3xl glass-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-700 flex items-center gap-1">
              <Sparkles size={13} className="text-[#FF7A50]" />
              <span>── 我想成为的自己 ──</span>
            </span>
            {!isEditingIdealSelf ? (
              <button
                id="edit-ideal-self-btn"
                onClick={() => setIsEditingIdealSelf(true)}
                className="text-[11px] text-[#FF7A50] hover:underline flex items-center gap-0.5"
              >
                <Edit3 size={11} />
                <span>修改</span>
              </button>
            ) : (
              <button
                onClick={handleSaveIdealSelf}
                className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5"
              >
                <Check size={12} />
                <span>保存</span>
              </button>
            )}
          </div>

          {!isEditingIdealSelf ? (
            <p className="text-xs sm:text-[13px] text-stone-800 font-serif-sc leading-relaxed pl-1">
              “{user.idealSelf}”
            </p>
          ) : (
            <div className="mt-2">
              <textarea
                value={idealSelfInput}
                onChange={(e) => setIdealSelfInput(e.target.value)}
                rows={2}
                className="w-full text-xs p-2.5 rounded-2xl bg-white/90 border border-[#FF8A65]/40 focus:outline-none focus:ring-2 focus:ring-[#FF7A50]/30 resize-none font-serif-sc"
              />
            </div>
          )}
        </div>

        {/* 2. ── 我的人格与说话语气 ── */}
        <div className="p-4 rounded-3xl glass-card space-y-3">
          <span className="text-xs font-bold text-stone-700 block">── 我的人格设定 ──</span>

          {/* Current Persona */}
          <div className="p-3 rounded-2xl glass-card-subtle flex items-center justify-between">
            <div>
              <span className="text-[10px] text-stone-400 block">当前人格</span>
              <p className="text-xs font-bold text-stone-800 flex items-center gap-1.5 mt-0.5">
                <span>{currentPersona.avatarIcon}</span>
                <span>{currentPersona.name}</span>
              </p>
            </div>
            <button
              id="toggle-persona-edit-btn"
              onClick={() => setIsEditingPersona(!isEditingPersona)}
              className="text-[11px] text-[#78649E] px-2.5 py-1 rounded-xl glass-card hover:bg-white"
            >
              {isEditingPersona ? "收起" : "切换人格"}
            </button>
          </div>

          {/* Persona options grid */}
          {isEditingPersona && (
            <div className="grid grid-cols-2 gap-2 pt-1 animate-fade-in">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPersona(p.id)}
                  className={`p-2.5 rounded-2xl text-left border transition-all ${
                    user.personaId === p.id
                      ? "glass-card-strong border-[#FF7A50] text-[#55407A] ring-2 ring-[#FF7A50]/20"
                      : "glass-card-subtle text-stone-700 hover:text-stone-900"
                  }`}
                >
                  <div className="flex items-center gap-1 text-xs font-bold mb-0.5">
                    <span>{p.avatarIcon}</span>
                    <span>{p.name}</span>
                  </div>
                  <p className="text-[10px] text-stone-400 line-clamp-1">{p.tagline}</p>
                </button>
              ))}
            </div>
          )}

          {/* MBTI & Tone setting */}
          <div className="p-3 rounded-2xl glass-card-subtle flex items-center justify-between">
            <div>
              <span className="text-[10px] text-stone-400 block">MBTI 语气基调（仅决定语调软硬）</span>
              <p className="text-xs font-bold text-stone-800 mt-0.5">{user.mbti}</p>
            </div>
            <button
              onClick={() => setIsEditingMBTI(!isEditingMBTI)}
              className="text-[11px] text-[#78649E] px-2.5 py-1 rounded-xl glass-card hover:bg-white"
            >
              {isEditingMBTI ? "收起" : "修改"}
            </button>
          </div>

          {isEditingMBTI && (
            <div className="grid grid-cols-2 gap-1.5 pt-1 animate-fade-in">
              {MBTI_OPTIONS.map((m) => (
                <button
                  key={m.code}
                  onClick={() => handleSelectMBTI(m.code)}
                  className={`p-2 rounded-xl text-left border text-xs transition-all ${
                    user.mbti === m.code
                      ? "bg-emerald-50/90 border-emerald-300 text-[#2B7A68] font-bold shadow-2xs"
                      : "glass-card-subtle text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <div>{m.label}</div>
                  <div className="text-[9px] text-stone-400 line-clamp-1">{m.tone}</div>
                </button>
              ))}
            </div>
          )}

          {/* Praise Style */}
          <div className="p-3 rounded-2xl glass-card-subtle flex items-center justify-between">
            <div>
              <span className="text-[10px] text-stone-400 block">说话风格偏好（由人格自动预设）</span>
              <p className="text-xs font-bold text-stone-800 mt-0.5">{user.praiseStyle}</p>
              <p className="text-[9px] text-stone-400 mt-0.5">切换人格会覆盖为预设，这里可手动调整</p>
            </div>
            <div className="flex gap-1">
              {(["热烈 + 肯定", "含蓄 + 温润"] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => onUpdateUserProfile({ praiseStyle: style })}
                  className={`text-[10px] px-2.5 py-1 rounded-xl border transition-all shadow-2xs ${
                    user.praiseStyle === style
                      ? "bg-[#FF7A50] text-white border-transparent"
                      : "glass-card-subtle text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. ── 我在意的（内耗标签） ── */}
        <div className="p-4 rounded-3xl glass-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-700">── 我在意的内耗主题 ──</span>
            <button
              onClick={() => setIsEditingTags(!isEditingTags)}
              className="text-[11px] text-[#78649E] hover:underline"
            >
              {isEditingTags ? "完成" : "编辑标签"}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 my-2">
            {CONCERN_TAGS.map((tag) => {
              const isSelected = user.innerConcernTags.includes(tag)

              if (!isEditingTags && !isSelected) return null

              return (
                <button
                  key={tag}
                  disabled={!isEditingTags}
                  onClick={() => toggleConcernTag(tag)}
                  className={`text-[11px] px-3 py-1 rounded-full transition-all border ${
                    isSelected
                      ? "glass-card-strong text-[#78649E] font-semibold border-white/95"
                      : "glass-card-subtle text-stone-400 hover:text-stone-600"
                  }`}
                >
                  {tag} {isEditingTags && (isSelected ? "✓" : "+")}
                </button>
              )
            })}
          </div>

          <p className="text-[10px] text-stone-400 mt-2 font-serif-sc">
            ┈ 这些是我陪你说话时的依据，随时可以改。（透明是最好的信任）
          </p>
        </div>

        {/* 3.5 ── 初次相遇时你说过 ── (Step 3 原话，只读) */}
        {user.freeDescription && (
          <div className="p-4 rounded-3xl glass-card">
            <span className="text-xs font-bold text-stone-700 flex items-center gap-1 mb-2">
              <Sparkles size={13} className="text-[#FF7A50]" />
              <span>── 初次相遇时你说过 ──</span>
            </span>
            <p className="text-xs sm:text-[13px] text-stone-800 font-serif-sc leading-relaxed pl-1">
              “{user.freeDescription}”
            </p>
          </div>
        )}

        {/* 4. ── 关于夸夸镜与硬件 ── */}
        <div className="p-4 rounded-3xl glass-card space-y-2">
          <span className="text-xs font-bold text-stone-700 block mb-1">── 硬件与隐私 ──</span>

          {/* Connect Mirror Hardware Toggle */}
          <div className="p-3 rounded-2xl glass-card-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🪞</span>
              <div>
                <p className="text-xs font-semibold text-stone-800">连接夸夸镜硬件</p>
                <p className="text-[10px] text-stone-400">
                  {user.isMirrorConnected ? "已配对并同步晨间夸夸" : "未连接（APP可完全独立使用）"}
                </p>
              </div>
            </div>
            <button
              id="profile-mirror-toggle-btn"
              onClick={onToggleMirror}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all shadow-2xs ${
                user.isMirrorConnected
                  ? "bg-emerald-100/90 text-emerald-800 border border-emerald-300"
                  : "bg-stone-200/80 text-stone-600 border border-stone-300/60"
              }`}
            >
              {user.isMirrorConnected ? "已连接" : "模拟连接"}
            </button>
          </div>

          {/* Privacy modal trigger */}
          <button
            onClick={() => setShowPrivacyModal(true)}
            className="w-full p-3 rounded-2xl glass-card-subtle hover:bg-white/90 flex items-center justify-between text-xs text-stone-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-emerald-600" />
              <span>隐私与安全说明（APP无摄像头声明）</span>
            </div>
            <span className="text-stone-400">→</span>
          </button>

          {/* Help */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="w-full p-3 rounded-2xl glass-card-subtle hover:bg-white/90 flex items-center justify-between text-xs text-stone-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <HelpCircle size={14} className="text-[#FF7A50]" />
              <span>产品使用理念与留存规则</span>
            </div>
            <span className="text-stone-400">→</span>
          </button>

          {/* Reset Onboarding demo */}
          <button
            id="reset-onboarding-btn"
            onClick={onResetOnboarding}
            className="w-full p-3 rounded-2xl glass-card-subtle hover:bg-white/90 flex items-center justify-between text-xs text-[#FF7A50] font-medium transition-colors"
          >
            <div className="flex items-center gap-2">
              <RotateCcw size={14} />
              <span>重新体验新手引导 (Onboarding)</span>
            </div>
            <span>重温 →</span>
          </button>
        </div>

        {/* 退出登录（温和的退出出口，不删除本机数据） */}
        <div className="pt-2">
          <button
            id="logout-btn"
            onClick={onLogout}
            className="w-full p-3 rounded-2xl glass-card-subtle hover:bg-white/90 flex items-center justify-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            <LogOut size={13} />
            <span>退出登录</span>
          </button>
          <p className="text-[10px] text-stone-400 text-center mt-2 font-serif-sc">
            你的记录仍保留在本机，重新登录即可回来
          </p>
        </div>

        {/* Privacy Explanation Modal (PRD Section 1.3 & 4.6) */}
        {showPrivacyModal && (
          <CompanionDialog isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} label="隐私与安全承诺">
            <div className="glass-modal rounded-3xl p-6 max-w-sm w-full text-stone-800">
              <div className="flex items-center gap-2 text-emerald-600 mb-3 font-bold text-base">
                <Shield size={20} />
                <span>隐私与安全承诺</span>
              </div>

              <div className="space-y-3 text-xs text-stone-600 leading-relaxed font-serif-sc mb-5">
                <p className="font-bold text-stone-900">1. APP 端完全不使用摄像头、不采集人脸、不做面部识别。</p>
                <p>2. 你的对话与自我记录仅用于在云端生成专属陪伴回应，不用于任何商业广告画像。</p>
                <p>3. 里程碑任务的纪念照片完全由你主动选图，不进行任何面部或身份识别。</p>
                <p>4. 硬件镜子仅在有人走近时进行瞬时氛围状态感应，不存储人脸库，保障绝对隐私。</p>
              </div>

              <button
                onClick={() => setShowPrivacyModal(false)}
                className="w-full py-2.5 rounded-2xl bg-stone-900 text-white text-xs font-medium hover:bg-stone-800"
              >
                我知道了
              </button>
            </div>
          </CompanionDialog>
        )}

        {/* Help Modal */}
        {showHelpModal && (
          <CompanionDialog isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} label="夸夸镜核心设计理念">
            <div className="glass-modal rounded-3xl p-6 max-w-sm w-full text-stone-800">
              <div className="flex items-center gap-2 text-[#FF7A50] mb-3 font-bold text-base">
                <HelpCircle size={20} />
                <span>夸夸镜核心设计理念</span>
              </div>

              <div className="space-y-2.5 text-xs text-stone-600 leading-relaxed font-serif-sc mb-5">
                <p>
                  <strong>不制造内疚：</strong>产品绝不考核连续打卡天数，没有断签惩罚，随时想来就来。
                </p>
                <p>
                  <strong>不做主观打分：</strong>
                  AI绝不给你的自我接纳度或品质打分，页面上的难度分1-5纯属你自己的主观感受。
                </p>
                <p>
                  <strong>双向分工：</strong>镜子负责即时肯定，APP负责多轮深度倾听与摆脱内耗。
                </p>
              </div>

              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full py-2.5 rounded-2xl bg-stone-900 text-white text-xs font-medium hover:bg-stone-800"
              >
                明白
              </button>
            </div>
          </CompanionDialog>
        )}
      </div>
    </div>
  )
}
