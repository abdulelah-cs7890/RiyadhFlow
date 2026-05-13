'use client'

import { memo, useEffect, useId, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Crosshair, Loader2 } from 'lucide-react'

interface StartLocationPromptProps {
  open: boolean;
  onClose: () => void;
  onUseCurrentLocation: () => void;
  isLocating?: boolean;
}

function StartLocationPrompt({ open, onClose, onUseCurrentLocation, isLocating = false }: StartLocationPromptProps) {
  const t = useTranslations('errors')
  const tGps = useTranslations('gps')
  const titleId = useId()
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="start-prompt-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLocating) onClose()
      }}
      role="presentation"
    >
      <div
        ref={cardRef}
        className="start-prompt-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h3 id={titleId} className="start-prompt-title">{t('startPromptTitle')}</h3>
        <p className="start-prompt-body">{t('startPromptBody')}</p>
        <div className="start-prompt-actions">
          <button
            type="button"
            className="start-prompt-btn start-prompt-btn--primary"
            onClick={onUseCurrentLocation}
            disabled={isLocating}
            aria-busy={isLocating}
          >
            {isLocating ? (
              <>
                <Loader2 size={14} className="lucide-spin" aria-hidden strokeWidth={2} />
                <span>{tGps('locating')}</span>
              </>
            ) : (
              <>
                <Crosshair size={14} aria-hidden strokeWidth={2} />
                <span>{t('startPromptUseLocation')}</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="start-prompt-btn start-prompt-btn--secondary"
            onClick={onClose}
            disabled={isLocating}
          >
            {t('startPromptCancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(StartLocationPrompt)
