import React, { type CSSProperties, type ReactNode, useEffect, useState } from "react"
import { useSafeArea } from "../hooks/useSafeArea"
import { StatusBar } from "./StatusBar"

interface H5AppFrameProps {
  children: ReactNode
  navigation: ReactNode
  overlays: ReactNode
}

function isStandaloneMode(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches
}

export const H5AppFrame: React.FC<H5AppFrameProps> = ({ children, navigation, overlays }) => {
  const { safeTop, safeBottom, isImmersive } = useSafeArea()
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const update = () => setIsStandalone(isStandaloneMode())
    const media = window.matchMedia("(display-mode: standalone)")
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const showStatusBar = !isStandalone && !isImmersive
  const frameStyle = {
    "--h5-frame-top": `${showStatusBar ? 44 : safeTop}px`,
    "--h5-safe-bottom": `${safeBottom}px`,
  } as CSSProperties

  return (
    <div className="min-h-dvh bg-hero-glow flex flex-col justify-between selection:bg-rose-100" style={frameStyle}>
      {showStatusBar && <StatusBar />}
      <main className="flex-1 w-full min-h-0 pt-[var(--h5-frame-top)]">{children}</main>
      {navigation}
      {overlays}
    </div>
  )
}
