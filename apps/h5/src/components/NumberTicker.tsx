import React, { useState, useEffect } from "react"

interface NumberTickerProps {
  value: number
  duration?: number // 滚动时长 ms
  className?: string
}

// 数字滚动动画：从 0 缓动滚动到目标值
export const NumberTicker: React.FC<NumberTickerProps> = ({ value, duration = 1000, className = "" }) => {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setDisplay(Math.round(eased * value))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <span className={className}>{display}</span>
}
