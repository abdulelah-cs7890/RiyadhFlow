'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useWeather } from '../hooks/useWeather'
import { classifyDust, conditionEmoji } from '../utils/weather'

function WeatherPill() {
  const t = useTranslations('weather')
  const { weather, isLoading, error } = useWeather()
  const [expanded, setExpanded] = useState(false)
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

  if (error || isLoading || !weather) return null

  const dust = classifyDust(weather.pm10, weather.dust)
  const isDustWarn = dust.level === 'storm' || dust.level === 'severe'
  const emoji = isDustWarn ? '🌫️' : conditionEmoji(weather.condition)
  const label = `${emoji} ${weather.tempC}°`
  const conditionLabel = t(`condition.${weather.condition}`)
  const dustLabel = t(`dust.${dust.level}`)

  return (
    <div ref={wrapRef} className={`weather-pill-wrap${expanded ? ' is-expanded' : ''}`}>
      <button
        type="button"
        className={`weather-pill${isDustWarn ? ' is-dust' : ''}`}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        title={conditionLabel}
      >
        {label}
        {isDustWarn && <span className="weather-pill-warn-dot" aria-hidden>⚠️</span>}
      </button>
      {expanded && (
        <div className="weather-pill-panel" role="region" aria-label={conditionLabel}>
          <div className="weather-pill-headline">
            {emoji} {weather.tempC}° · {conditionLabel}
          </div>
          {isDustWarn && (
            <div className="weather-pill-dust-warn" role="alert">
              ⚠️ {dustLabel}
            </div>
          )}
          <div className="weather-pill-row">
            <span className="weather-pill-name">{t('humidity')}</span>
            <span className="weather-pill-value">{weather.humidity}%</span>
          </div>
          <div className="weather-pill-row">
            <span className="weather-pill-name">{t('wind')}</span>
            <span className="weather-pill-value">{weather.windKph} {t('kph')}</span>
          </div>
          {weather.pm10 != null && (
            <div className="weather-pill-row">
              <span className="weather-pill-name">{t('pm10')}</span>
              <span className="weather-pill-value">{weather.pm10}</span>
            </div>
          )}
          {!isDustWarn && dust.level !== 'normal' && (
            <div className="weather-pill-row">
              <span className="weather-pill-name">{t('air')}</span>
              <span className="weather-pill-value">{dustLabel}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(WeatherPill)
