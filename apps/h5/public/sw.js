/* 夸夸镜 PWA Service Worker
 * 策略：网络优先（保证数据实时），失败回退缓存（离线可用）
 */
const CACHE_NAME = "kuakua-pwa-v1"
const CORE_ASSETS = ["/", "/index.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== "GET") return

  // 仅处理同源请求
  if (url.origin !== self.location.origin) return

  // API：网络优先，失败时回退缓存（若有）
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return res
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // 静态资源与页面：网络优先，离线回退缓存（stale-while-revalidate）
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
