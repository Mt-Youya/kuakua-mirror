import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// PWA：注册 Service Worker（网络优先，开发不干扰、生产可离线）
// file:// 环境（APK WebView / 本地直接打开）不支持 SW，跳过注册
if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.error("Service Worker 注册失败：", err)
    })
  })
}
