'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { useLocale } from '../../../i18n/LocaleProvider'
import type { TransitPlan } from '../services/transitRouting'

interface TransitSummaryCardProps {
  plan: TransitPlan
}

function TransitSummaryCard({ plan }: TransitSummaryCardProps) {
  const t = useTranslations('routing.metro')
  const { locale } = useLocale()

  return (
    <div className="transit-summary">
      <div className="transit-summary-header">
        <span className="transit-summary-icon" aria-hidden="true">🚇</span>
        <h3 className="transit-summary-title">{t('summaryTitle')}</h3>
        <span className="transit-summary-total">
          {t('totalTime', { mins: Math.round(plan.totalMinutes) })}
        </span>
      </div>

      <ol className="transit-legs">
        {plan.legs.map((leg, i) => {
          if (leg.kind === 'walk') {
            const mins = Math.max(1, Math.round(leg.minutes))
            const stationName = leg.toStationName
              ? locale === 'ar' ? leg.toStationName.ar : leg.toStationName.en
              : leg.fromStationName
                ? locale === 'ar' ? leg.fromStationName.ar : leg.fromStationName.en
                : null
            const isBoarding = Boolean(leg.toStationName)
            return (
              <li key={i} className="transit-leg transit-leg--walk">
                <span className="transit-leg-icon" aria-hidden="true">🚶</span>
                <span className="transit-leg-text">
                  {stationName
                    ? (isBoarding
                        ? t('walkTo', { mins, station: stationName })
                        : t('walkFrom', { mins, station: stationName }))
                    : t('walk', { mins })}
                </span>
              </li>
            )
          }
          const lineName = locale === 'ar' ? leg.lineNameAr : leg.lineNameEn
          return (
            <li key={i} className="transit-leg transit-leg--train">
              <span
                className="transit-leg-stripe"
                style={{ backgroundColor: leg.lineColor }}
                aria-hidden="true"
              />
              <span className="transit-leg-text">
                {t('takeLine', {
                  line: lineName,
                  stops: leg.stopCount,
                  mins: Math.round(leg.minutes),
                })}
              </span>
            </li>
          )
        })}
      </ol>

      {plan.transferCount > 0 && (
        <div className="transit-transfer-note">
          {t('transferCount', { count: plan.transferCount })}
        </div>
      )}
    </div>
  )
}

export default memo(TransitSummaryCard)
