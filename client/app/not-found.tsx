'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function NotFound() {
  const t = useTranslations('errors')
  return (
    <main className="not-found-page">
      <div className="not-found-card glass-pane">
        <div className="not-found-emoji" aria-hidden="true">🗺️</div>
        <h1 className="not-found-title">{t('notFoundTitle')}</h1>
        <p className="not-found-body">{t('notFoundBody')}</p>
        <Link href="/" className="not-found-cta">
          {t('notFoundCta')}
        </Link>
      </div>
    </main>
  )
}
