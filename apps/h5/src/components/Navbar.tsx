import React from "react"
import { Sparkles, Sprout, BookOpen } from "lucide-react"
import { useAppUiStore } from "../store/useAppUiStore"

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab, setIsChatOpen } = useAppUiStore()
  const tabs = [
    { id: "present", label: "此刻", icon: Sparkles },
    { id: "growth", label: "成长", icon: Sprout },
    { id: "review", label: "回顾", icon: BookOpen },
  ] as const

  return (
    <nav className="fixed bottom-[max(0.75rem,var(--h5-safe-bottom))] left-3 right-3 z-30 max-w-md mx-auto">
      <div className="glass-nav rounded-full flex items-center justify-between py-1.5 pl-2 pr-1.5 shadow-lg shadow-stone-900/5">
        {/* Tab 区 */}
        <div className="flex items-center justify-around flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 ${
                  isActive ? "text-stone-900 font-semibold" : "text-stone-400 hover:text-stone-600 font-normal"
                }`}
              >
                <div className="relative">
                  <Icon
                    size={18}
                    className={`transition-transform duration-200 ${
                      isActive ? "scale-110 stroke-[2.2] text-[#FF7A50]" : "stroke-[1.7]"
                    }`}
                  />
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF7A50] rounded-full"></span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* 聊一聊：所有 Tab 均显示（与底部导航同一水平线） */}
        <button
          id="floating-dialogue-btn"
          onClick={() => setIsChatOpen(true)}
          title="点击与想成为的自己交流"
          className="relative group p-0.5 rounded-full flex items-center justify-center cursor-pointer"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#FF7A50] to-[#C8B8D9] opacity-40 blur-md group-hover:opacity-75 transition-opacity"></div>
          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-md">
            <img
              src="./user_p1.png"
              alt="想聊聊"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </div>
          {/* 左上角小提示：吸引注意 */}
          <span className="absolute -top-1.5 -left-2 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#FF8A65] to-[#FF7A50] text-white text-[8px] font-bold shadow-md shadow-[#FF7A50]/40 border border-white/80 animate-bounce [animation-duration:2.2s]">
            聊
          </span>
        </button>
      </div>
    </nav>
  )
}
