import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "KuaKua Mirror",
  description: "智能镜子监控系统",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
