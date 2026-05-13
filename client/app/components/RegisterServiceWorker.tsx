'use client'

import { useEffect } from 'react'

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // In dev, defensively unregister any service worker left over from a
    // prior `npm run build && npm run start` session. A stale SW can serve
    // outdated HTML and cause hydration mismatches against the dev bundle.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister())
      }).catch(() => { /* noop */ })
      return
    }

    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* ignore — offline shell is best-effort */
      })
    }

    if (document.readyState === 'complete') {
      onLoad()
    } else {
      window.addEventListener('load', onLoad, { once: true })
    }
  }, [])

  return null
}
