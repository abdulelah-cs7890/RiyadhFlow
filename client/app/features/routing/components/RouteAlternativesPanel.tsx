'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { RouteAlternative, ROUTE_LABEL_KEYS } from '../types'

interface RouteAlternativesPanelProps {
  alternatives: RouteAlternative[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

function formatDistance(distanceMeters: number): string {
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatDuration(durationSeconds: number): string {
  return `${Math.round(durationSeconds / 60)} mins`;
}

function RouteAlternativesPanel({
  alternatives,
  selectedIndex,
  onSelect,
}: RouteAlternativesPanelProps) {
  const t = useTranslations('routing');

  if (alternatives.length <= 1) return null;

  return (
    <div className="route-alternatives">
      <h3 className="route-alternatives-title">{t('routeOptionsTitle')}</h3>
      <div className="route-alternatives-list" role="tablist" aria-label={t('routeAltAriaLabel')}>
        {alternatives.map((route) => {
          const isSelected = route.index === selectedIndex;
          const labelKey = ROUTE_LABEL_KEYS[route.index];

          return (
            <button
              key={route.index}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`route-option${isSelected ? ' active' : ''}`}
              onClick={() => onSelect(route.index)}
            >
              <div className="route-option-header">
                <span className="route-option-label">{labelKey ? t(labelKey) : t('routeOption', { n: route.index + 1 })}</span>
                <span className="route-option-time">{formatDuration(route.duration)}</span>
              </div>
              <div className="route-option-distance">{formatDistance(route.distance)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(RouteAlternativesPanel);
