'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'

interface RouteSummaryCardProps {
  startLocation: string;
  destination: string;
  distance: number;
  duration: number;
  via?: string;
  label: string;
}

function RouteSummaryCard({
  startLocation,
  destination,
  distance,
  duration,
  via,
  label,
}: RouteSummaryCardProps) {
  const t = useTranslations('routing');
  const km = (distance / 1000).toFixed(1);
  const mins = Math.round(duration / 60);
  const eta = new Date(Date.now() + duration * 1000)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const subtitle = [
    `${km} km`,
    `~${mins} min`,
    via ? t('via', { road: via }) : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="route-summary-card">
      <div className="route-summary-visual">
        <div className="route-dot route-dot--start" />
        <div className="route-dot-line" />
        <div className="route-dot route-dot--end" />
      </div>
      <div className="route-summary-info">
        <p className="route-summary-title">
          {startLocation} → {destination}
        </p>
        <p className="route-summary-subtitle">{subtitle}</p>
        <div className="route-summary-tags">
          <span className="route-tag">{label}</span>
          <span className="route-tag route-tag--eta">{t('arriveBy', { time: eta })}</span>
        </div>
      </div>
    </div>
  );
}

export default memo(RouteSummaryCard);
