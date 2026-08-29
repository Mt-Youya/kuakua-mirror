import React, { useState, useEffect } from "react"

interface TypewriterProps {
  text: string
  speed?: number // 每字间隔 ms
  className?: string
}

// 打字机效果：AI 回复逐字出现，带闪烁光标
export const Typewriter: React.FC<TypewriterProps> = ({ text, speed = 16, className = "" }) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(0)
    if (!text) return
    const timer = setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          clearInterval(timer)
          return c
        }
        return c + 1
      })
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])

  const typing = count < text.length

  return (
    <p className={className}>
      {text.slice(0, count)}
      {typing && <span className="type-cursor">▍</span>}
    </p>
  )
}
