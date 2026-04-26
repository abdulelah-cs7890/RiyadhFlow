'use client'

import { useTranslations } from 'next-intl'
import { useDepartureComparison } from '../hooks/useDepartureComparison'
import { TravelMode } from '../types'

interface BestTimePanelProps {
  startCoords: [number, number] | null
  endCoords: [number, number] | null
  travelMode: TravelMode
}

function formatHHmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function BestTimePanel({ startCoords, endCoords, travelMode }: BestTimePanelProps) {
  const t = useTranslations('bestTime')
  const { status, options, compare } = useDepartureComparison()

  if (!startCoords || !endCoords) return null
  if (travelMode !== 'driving') {
    return (
      <div className="best-time-pane">
        <div className="best-time-disabled">{t('drivingOnly')}</div>
      </div>
    )
  }

  const handleClick = () => {
    void compare(startCoords, endCoords)
  }

  const fastest = options[0]

  return (
    <div className="best-time-pane">
      <div className="best-time-header">
        <span>⏱️</span>
        <h3 className="best-time-title">{t('title')}</h3>
      </div>

      {status === 'idle' && (
        <button type="button" className="best-time-btn" onClick={handleClick}>
          {t('compareButton')}
        </button>
      )}

      {status === 'loading' && (
        <div className="best-time-loading">
          <span className="gps-spinner" aria-hidden="true" />
          <span>{t('loading')}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="best-time-error">
          <span>{t('failed')}</span>
          <button type="button" className="best-time-btn" onClick={handleClick}>
            {t('retry')}
          </button>
        </div>
      )}

      {status === 'ready' && fastest && (
        <ul className="best-time-list" role="list">
          {options.map((opt, i) => {
            const deltaMins = opt.etaMinutes - fastest.etaMinutes
            const isFastest = i === 0
            return (
              <li
                key={opt.departAt.toISOString()}
                className={`best-time-row${isFastest ? ' best-time-row--fastest' : ''}`}
              >
                <span className="best-time-depart">
                  {isFastest && <span aria-label={t('fastest')}>🏆 </span>}
                  {t('leave')} {formatHHmm(opt.departAt)}
                </span>
                <span className="best-time-eta">{t('etaMins', { mins: opt.etaMinutes })}</span>
                <span className="best-time-delta">
                  {isFastest ? t('fastest') : t('slowerBy', { mins: deltaMins })}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
