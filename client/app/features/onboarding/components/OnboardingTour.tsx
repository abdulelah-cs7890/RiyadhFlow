'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { useOnboarding } from '../hooks/useOnboarding'

interface Step {
  id: string;
  selector: string;
  titleKey: string;
  bodyKey: string;
  placement: 'top' | 'bottom';
}

const STEPS: Step[] = [
  { id: 'search', selector: '[data-onboarding="search"]', titleKey: 'searchTitle', bodyKey: 'searchBody', placement: 'bottom' },
  { id: 'modes', selector: '[data-onboarding="modes"]', titleKey: 'modesTitle', bodyKey: 'modesBody', placement: 'top' },
  { id: 'find', selector: '[data-onboarding="find"]', titleKey: 'findTitle', bodyKey: 'findBody', placement: 'top' },
  { id: 'categories', selector: '[data-onboarding="categories"]', titleKey: 'categoriesTitle', bodyKey: 'categoriesBody', placement: 'bottom' },
]

interface Rect { top: number; left: number; width: number; height: number }

export default function OnboardingTour() {
  const t = useTranslations('onboarding')
  const { isOpen, stepIndex, next, skip } = useOnboarding(STEPS.length)
  const [rect, setRect] = useState<Rect | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const step = STEPS[stepIndex]

  useLayoutEffect(() => {
    if (!isOpen || !step) {
      setRect(null)
      return
    }
    const measure = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null
      if (!el) {
        setRect(null)
        return
      }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    measure()
    const id = setInterval(measure, 200)
    window.addEventListener('resize', measure)
    return () => {
      clearInterval(id)
      window.removeEventListener('resize', measure)
    }
  }, [isOpen, step])

  if (!mounted || !isOpen || !step) return null

  const placement = step.placement
  const cardTop = rect
    ? placement === 'bottom'
      ? rect.top + rect.height + 12
      : rect.top - 12
    : window.innerHeight / 2 - 100
  const cardLeft = rect
    ? Math.max(16, Math.min(rect.left + rect.width / 2 - 160, window.innerWidth - 336))
    : window.innerWidth / 2 - 160
  const cardTransform = placement === 'top' && rect ? 'translateY(-100%)' : undefined

  const isLast = stepIndex === STEPS.length - 1
  const stepLabel = `${stepIndex + 1} / ${STEPS.length}`

  return createPortal(
    <div className="onboarding-overlay" role="dialog" aria-modal="true">
      <div className="onboarding-backdrop" onClick={skip} />
      {rect && (
        <div
          className="onboarding-spotlight"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
          }}
        />
      )}
      <div
        className="onboarding-card"
        style={{ top: cardTop, left: cardLeft, transform: cardTransform }}
      >
        <div className="onboarding-card-step">{stepLabel}</div>
        <h3 className="onboarding-card-title">{t(step.titleKey)}</h3>
        <p className="onboarding-card-body">{t(step.bodyKey)}</p>
        <div className="onboarding-card-actions">
          <button type="button" className="onboarding-skip" onClick={skip}>
            {t('skip')}
          </button>
          <button type="button" className="onboarding-next" onClick={next}>
            {isLast ? t('done') : t('next')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
