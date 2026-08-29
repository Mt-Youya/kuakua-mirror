import { useEffect, useState } from "react"

// 读取真实安全区：用离屏元素 + getComputedStyle 读取 env(safe-area-inset-*)
// - PWA standalone / Android WebView（沉浸式全屏）下返回系统真实安全区
// - 普通浏览器 tab 下 env() 恒为 0，回退到默认值（保留模拟状态栏设计）
function readSafeArea(): { top: number; bottom: number } {
  const probe = document.createElement("div")
  probe.style.cssText =
    "position:fixed;width:0;height:0;pointer-events:none;visibility:hidden;" +
    "padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);"
  document.body.appendChild(probe)
  const cs = getComputedStyle(probe)
  const parse = (v: string) => (v ? Math.max(0, parseFloat(v) || 0) : 0)
  const top = parse(cs.paddingTop)
  const bottom = parse(cs.paddingBottom)
  document.body.removeChild(probe)
  return { top, bottom }
}

export interface SafeArea {
  /** 顶部安全区（px）；普通浏览器 tab 下为默认模拟状态栏高度 44 */
  safeTop: number
  /** 底部安全区（px） */
  safeBottom: number
  /** 是否处于 standalone / WebView 沉浸模式（系统状态栏被隐藏、需避让真安全区） */
  isImmersive: boolean
}

const FALLBACK_TOP = 44 // 模拟状态栏高度（与 StatusBar h-11 对齐）

export function useSafeArea(): SafeArea {
  const [state, setState] = useState<SafeArea>(() => {
    const { top, bottom } = readSafeArea()
    const isImmersive = top > 0 || bottom > 0
    return {
      safeTop: isImmersive ? top : FALLBACK_TOP,
      safeBottom: bottom,
      isImmersive,
    }
  })

  useEffect(() => {
    let mounted = true
    const update = () => {
      if (!mounted) return
      const { top, bottom } = readSafeArea()
      const isImmersive = top > 0 || bottom > 0
      setState({
        safeTop: isImmersive ? top : FALLBACK_TOP,
        safeBottom: bottom,
        isImmersive,
      })
    }

    // 视口变化（横竖屏、地址栏收起、沉浸模式切换）时重测
    window.visualViewport?.addEventListener("resize", update)
    window.visualViewport?.addEventListener("scroll", update)
    window.addEventListener("resize", update)
    // orientationchange 后延迟重测（等浏览器稳定）
    window.addEventListener("orientationchange", update)
    // 延迟首测：某些 WebView 在初始 frame 后才有正确 inset
    const t = window.setTimeout(update, 300)

    return () => {
      mounted = false
      window.visualViewport?.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      window.removeEventListener("orientationchange", update)
      window.clearTimeout(t)
    }
  }, [])

  return state
}
