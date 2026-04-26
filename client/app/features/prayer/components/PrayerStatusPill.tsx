'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { usePrayerTimes } from '../hooks/usePrayerTimes'
import { PRAYER_ORDER, type PrayerName } from '../utils/prayerTimes'
import { fetchPlacesFromDb } from '@/app/features/places/services/placesSearch'
import type { PlaceData } from '@/app/utils/mockData'

const NAME_KEY: Record<PrayerName, string> = {
  Fajr: 'fajr',
  Dhuhr: 'dhuhr',
  Asr: 'asr',
  Maghrib: 'maghrib',
  Isha: 'isha',
}

interface PrayerStatusPillProps {
  userCoords?: [number, number] | null;
  onShowNearestMosque?: (place: PlaceData) => void;
}

function PrayerStatusPill({ userCoords = null, onShowNearestMosque }: PrayerStatusPillProps) {
  const t = useTranslations('prayer')
  const { times, next, isLoading, error } = usePrayerTimes()
  const [expanded, setExpanded] = useState(false)
  const [mosqueLoading, setMosqueLoading] = useState(false)
  const [mosqueError, setMosqueError] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!expanded) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setExpanded(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [expanded])

  if (error || isLoading || !next || !times) return null

  const prayerName = t(NAME_KEY[next.name])
  const hours = Math.floor(next.minutesUntil / 60)
  const mins = next.minutesUntil % 60
  const countdown = hours > 0
    ? t('hoursLabel', { hours, mins })
    : t('minutesLabel', { mins })
  const label = `🕌 ${prayerName} · ${countdown}`

  return (
    <div ref={wrapRef} className={`prayer-pill-wrap${expanded ? ' is-expanded' : ''}`}>
      <button
        type="button"
        className="prayer-pill"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        title={t('nextPrayer', { name: prayerName })}
      >
        {label}
      </button>
      {expanded && (
        <div className="prayer-pill-panel" role="region" aria-label={t('nextPrayer', { name: prayerName })}>
          {PRAYER_ORDER.map((name) => (
            <div
              key={name}
              className={`prayer-pill-row${name === next.name ? ' is-next' : ''}`}
            >
              <span className="prayer-pill-name">{t(NAME_KEY[name])}</span>
              <span className="prayer-pill-time">{times[name]}</span>
            </div>
          ))}
          {onShowNearestMosque && (
            <button
              type="button"
              className="prayer-nearest-mosque-btn"
              disabled={!userCoords || mosqueLoading}
              onClick={async () => {
                if (!userCoords) return;
                setMosqueLoading(true);
                setMosqueError(false);
                try {
                  const results = await fetchPlacesFromDb('Mosques', {
                    lat: userCoords[1],
                    lng: userCoords[0],
                    radius: 5000,
                  });
                  if (results.length === 0) {
                    setMosqueError(true);
                    return;
                  }
                  onShowNearestMosque(results[0]);
                  setExpanded(false);
                } catch {
                  setMosqueError(true);
                } finally {
                  setMosqueLoading(false);
                }
              }}
            >
              {mosqueLoading ? '…' : `🕌 ${t('nearestMosque')}`}
            </button>
          )}
          {mosqueError && (
            <div className="prayer-nearest-mosque-error" role="alert">
              {t('nearestMosqueError')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(PrayerStatusPill)
