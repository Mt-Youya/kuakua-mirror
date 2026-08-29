import React from "react"
import { UserProfile } from "../types"

interface HeaderProps {
  user: UserProfile
  onOpenProfile: () => void
}

// 时间感知问候：按系统时间切换早晚安
function getGreeting(date: Date): { emoji: string; text: string } {
  const h = date.getHours()
  if (h >= 5 && h < 12) return { emoji: "☀️", text: "早上好" }
  if (h >= 12 && h < 18) return { emoji: "🌤️", text: "下午好" }
  return { emoji: "🌙", text: "晚上好" }
}

export const Header: React.FC<HeaderProps> = ({ user, onOpenProfile }) => {
  const greeting = getGreeting(new Date())

  return (
    <header className="w-full px-4 pt-3 pb-2">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* 左侧：时间感知问候（渐变文字） */}
        <span className="text-sm font-semibold tracking-tight">
          <span className="mr-1.5">{greeting.emoji}</span>
          <span className="text-gradient">
            {greeting.text}，{user.nickname || "朋友"}
          </span>
        </span>

        {/* 右侧：头像 */}
        <button
          id="header-profile-avatar-btn"
          onClick={onOpenProfile}
          title="个人主页"
          className="w-8 h-8 rounded-full overflow-hidden border border-white/95 shadow-sm hover:ring-2 hover:ring-[#C8B8D9]/70 transition-all relative cursor-pointer"
        >
          <img
            src={user.avatar}
            alt={user.nickname}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </button>
      </div>
    </header>
  )
}
