'use client'

import { useEffect } from 'react'

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

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
