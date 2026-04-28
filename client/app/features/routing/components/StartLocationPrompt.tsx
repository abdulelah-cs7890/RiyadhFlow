'use client'

import { memo, useEffect, useId, useRef } from 'react'
import { useTranslations } from 'next-intl'

interface StartLocationPromptProps {
  open: boolean;
  onClose: () => void;
  onUseCurrentLocation: () => void;
}

function StartLocationPrompt({ open, onClose, onUseCurrentLocation }: StartLocationPromptProps) {
  const t = useTranslations('errors')
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
        if (e.target === e.currentTarget) onClose()
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
          >
            {t('startPromptUseLocation')}
          </button>
          <button
            type="button"
            className="start-prompt-btn start-prompt-btn--secondary"
            onClick={onClose}
          >
            {t('startPromptCancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(StartLocationPrompt)
