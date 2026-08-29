import React, { useState } from "react"
import { Sparkles, Phone, Mail, ArrowRight, ShieldCheck } from "lucide-react"

interface LoginModalProps {
  onLogin: (method: "phone" | "email", account: string) => void
  onSkip: () => void
}

type LoginMethod = "phone" | "email"

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onSkip }) => {
  const [method, setMethod] = useState<LoginMethod>("phone")
  const [account, setAccount] = useState("")
  const [credential, setCredential] = useState("")

  const isPhone = method === "phone"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!account.trim()) return
    onLogin(method, account.trim())
  }

  return (
    <div className="h5-fullscreen z-40 bg-[#F8F9FC] bg-hero-glow flex flex-col justify-between p-5 overflow-y-auto animate-fade-in">
      {/* 顶部品牌 */}
      <div className="pt-2 pb-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF7A50]">
          <Sparkles size={14} />
          <span>夸夸镜 · 初次相遇</span>
        </div>
      </div>

      {/* 中部内容 */}
      <div className="flex-1 flex flex-col justify-center py-2">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900 font-serif-sc mb-1">欢迎回来，把夸夸带在身边</h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              登录后你的记录会绑定在这台设备上，方便随时回来看看镜中的自己。
            </p>
          </div>

          {/* 登录方式二选一 */}
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { id: "phone", label: "手机号", icon: Phone },
                { id: "email", label: "邮箱", icon: Mail },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon
              const isSelected = method === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMethod(opt.id)}
                  className={`py-2.5 rounded-2xl text-xs font-medium border transition-all shadow-2xs flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? "glass-card-strong border-[#C8B8D9] text-[#55407A] font-semibold ring-2 ring-[#78649E]/15"
                      : "glass-card-subtle text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <Icon size={14} />
                  <span>{opt.label}</span>
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* 账号输入 */}
            <div>
              <label className="text-[11px] font-medium text-stone-600 mb-1 block">{isPhone ? "手机号" : "邮箱"}</label>
              <input
                id="login-account-input"
                type={isPhone ? "tel" : "email"}
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder={isPhone ? "请输入手机号" : "请输入邮箱"}
                className="w-full text-xs px-3.5 py-3 rounded-2xl glass-card-subtle text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#C8B8D9] focus:bg-white transition-all shadow-2xs"
              />
            </div>

            {/* 验证码 / 密码占位（Demo：任意填写） */}
            <div>
              <label className="text-[11px] font-medium text-stone-600 mb-1 block">{isPhone ? "验证码" : "密码"}</label>
              <input
                id="login-credential-input"
                type="text"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                placeholder={isPhone ? "验证码（Demo 随便填）" : "密码（Demo 随便填）"}
                className="w-full text-xs px-3.5 py-3 rounded-2xl glass-card-subtle text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#C8B8D9] focus:bg-white transition-all shadow-2xs"
              />
            </div>

            {/* 登录 / 注册 主按钮 */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={!account.trim()}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF7A50] to-[#FA6400] text-white text-xs font-semibold shadow-md shadow-[#FF7A50]/20 hover:opacity-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:shadow-none"
            >
              <span>登录 / 注册</span>
              <ArrowRight size={14} />
            </button>

            <p className="text-[10px] text-stone-400 text-center font-serif-sc">
              Demo 阶段：随便填什么，点击即可登录成功
            </p>
          </form>
        </div>
      </div>

      {/* 底部：跳过，稍后登录 */}
      <div className="pt-4 pb-safe border-t border-stone-200/50 flex flex-col items-center gap-2.5">
        <button
          id="login-skip-btn"
          onClick={onSkip}
          className="text-xs text-stone-400 hover:text-[#FF7A50] transition-colors font-medium cursor-pointer"
        >
          跳过，稍后登录
        </button>
        <span className="text-[10px] text-stone-400 flex items-center gap-1">
          <ShieldCheck size={11} className="text-emerald-500" />
          登录信息仅保存在本机，后续云端同步预留
        </span>
      </div>
    </div>
  )
}
