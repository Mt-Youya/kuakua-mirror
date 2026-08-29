import React, { useMemo } from "react"

interface SparklesProps {
  count?: number
  className?: string
}

interface Star {
  id: number
  left: number
  top: number
  size: number
  delay: number
  duration: number
}

// 此刻页背景星星粒子：暖色星光闪烁（CSS 动画驱动，移动端性能友好）
export const Sparkles: React.FC<SparklesProps> = ({ count = 26, className = "" }) => {
  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 2 + Math.random() * 3,
        delay: Math.random() * 4,
        duration: 2.6 + Math.random() * 3,
      })),
    [count]
  )

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {stars.map((s) => (
        <span
          key={s.id}
          className="sparkle-star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
