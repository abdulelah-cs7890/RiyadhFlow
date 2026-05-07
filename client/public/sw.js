// RiyadhFlow service worker — minimal app-shell + offline fallback.
// Strategy: network-first for navigations, with a cached `/offline` fallback
// when the network fails. All other requests pass through to the network so
// we don't accidentally serve stale map tiles or stale API responses.

const CACHE = 'riyadhflow-shell-v1'
const OFFLINE_URL = '/offline'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  // Only intercept top-level page navigations; let everything else hit the
  // network normally so map tiles and API calls aren't disturbed.
  if (req.mode !== 'navigate') return

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req)
        return fresh
      } catch {
        const cache = await caches.open(CACHE)
        const cached = await cache.match(OFFLINE_URL)
        return cached || Response.error()
      }
    })()
  )
})
