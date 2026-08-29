import React from "react"

interface CharRevealProps {
  text: string
  className?: string
  charDelay?: number // 每字出现的间隔（ms）
}

// 夸夸文案逐字浮现（每个字符依次淡入上移）
export const CharReveal: React.FC<CharRevealProps> = ({ text, className = "", charDelay = 28 }) => (
  <p className={className}>
    {Array.from(text).map((ch, i) => (
      <span key={i} className="char-in" style={{ animationDelay: `${i * charDelay}ms` }}>
        {ch}
      </span>
    ))}
  </p>
)
