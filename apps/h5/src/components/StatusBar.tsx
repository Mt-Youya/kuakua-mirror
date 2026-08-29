import React, { useEffect, useState } from "react"
import { Signal, Wifi, BatteryFull } from "lucide-react"

// 模拟手机系统状态栏：显示策略和安全区由 H5AppFrame 统一决定。
export const StatusBar: React.FC = () => {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  const time = now.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-11 bg-white/70 backdrop-blur-md border-b border-white/60 text-stone-800 select-none">
      <div className="h-full max-w-md mx-auto w-full px-5 pb-1.5 flex items-end justify-between">
        <span className="text-[11px] font-semibold tracking-wide tabular-nums">{time}</span>
        <div className="flex items-center gap-1.5">
          <Signal size={13} strokeWidth={2.2} />
          <Wifi size={13} strokeWidth={2.2} />
          <BatteryFull size={16} className="text-emerald-600" strokeWidth={2.2} />
        </div>
      </div>
    </div>
  )
}
