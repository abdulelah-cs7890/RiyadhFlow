'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { MapPinOff } from 'lucide-react'

export default function NotFound() {
  const t = useTranslations('errors')
  return (
    <main className="not-found-page">
      <div className="not-found-card glass-pane">
        <MapPinOff size={48} strokeWidth={1.5} className="not-found-icon" aria-hidden />
        <h1 className="not-found-title">{t('notFoundTitle')}</h1>
        <p className="not-found-body">{t('notFoundBody')}</p>
        <Link href="/" className="not-found-cta">
          {t('notFoundCta')}
        </Link>
      </div>
    </main>
  )
}
