'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { TravelMode } from '../types'

interface TravelModeSwitcherProps {
  mode: TravelMode;
  onModeChange: (mode: TravelMode) => void;
  isCalculating?: boolean;
}

const MODE_ICONS: Record<TravelMode, JSX.Element> = {
  driving: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" fill="currentColor"/>
      <path d="M3 11l1.5-5A2 2 0 0 1 6.4 4.5h11.2a2 2 0 0 1 1.9 1.5L21 11M3 11v6a1 1 0 0 0 1 1h1.5M3 11h18m0 0v6a1 1 0 0 1-1 1h-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  walking: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="4.5" r="2" fill="currentColor"/>
      <path d="M13.5 7h-3L9 12l3 3-1.5 6.5M10.5 12l-3 3M14.5 12l2 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  cycling: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="17" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="18" cy="17" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6 17l4-8h4l2 4h2M12 9l-2 4h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  metro: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 8h8M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="9" cy="15" r="0.8" fill="currentColor"/>
      <circle cx="15" cy="15" r="0.8" fill="currentColor"/>
      <path d="M8 17l-1 3M16 17l1 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

const TRAVEL_MODES: TravelMode[] = ['driving', 'walking', 'cycling', 'metro'];

function TravelModeSwitcher({ mode, onModeChange, isCalculating = false }: TravelModeSwitcherProps) {
  const t = useTranslations('routing');

  const modeLabels: Record<TravelMode, string> = {
    driving: t('driveLabel'),
    walking: t('walkLabel'),
    cycling: t('bikeLabel'),
    metro: t('metroLabel'),
  };

  return (
    <div className="travel-mode-switcher" role="radiogroup" aria-label={t('travelModeAriaLabel')}>
      {TRAVEL_MODES.map((value) => {
        const isActive = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={modeLabels[value]}
            className={`travel-mode-btn${isActive ? ' active' : ''}${isCalculating ? ' is-calculating' : ''}`}
            onClick={() => onModeChange(value)}
            disabled={isCalculating}
          >
            {isActive && isCalculating ? (
              <span className="spinner travel-mode-spinner" aria-hidden="true" />
            ) : (
              MODE_ICONS[value]
            )}
            <span>{modeLabels[value]}</span>
          </button>
        );
      })}
    </div>
  );
}

export default memo(TravelModeSwitcher);
