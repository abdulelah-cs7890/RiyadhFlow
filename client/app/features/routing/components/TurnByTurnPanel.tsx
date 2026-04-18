'use client'

import { memo, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { RouteStep } from '../types'
import ManeuverIcon from './ManeuverIcon'

interface TurnByTurnPanelProps {
  steps: RouteStep[];
  onStepClick?: (location: [number, number]) => void;
}

function formatStepDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function TurnByTurnPanel({ steps, onStepClick }: TurnByTurnPanelProps) {
  const t = useTranslations('ui');
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Reset active step when the route itself changes
  useEffect(() => { setActiveIndex(-1); }, [steps]);

  if (!steps.length) return null;

  const activate = (i: number, location: [number, number]) => {
    setActiveIndex(i);
    onStepClick?.(location);
  };

  return (
    <div className="tbt-panel">
      <button
        type="button"
        className="tbt-header"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
      >
        <span className="tbt-header-text">
          {t('directions')}
          <span className="tbt-step-count">{t('steps', { count: steps.length })}</span>
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className={`tbt-chevron${isExpanded ? ' expanded' : ''}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isExpanded && (
        <ol className="tbt-steps">
          {steps.map((step, i) => (
            <li
              key={i}
              className={`tbt-step${i === activeIndex ? ' is-active' : ''}`}
              onClick={() => activate(i, step.location)}
              role={onStepClick ? 'button' : undefined}
              tabIndex={onStepClick ? 0 : undefined}
              aria-current={i === activeIndex ? 'step' : undefined}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && onStepClick) {
                  e.preventDefault();
                  activate(i, step.location);
                }
              }}
            >
              <div className="tbt-step-icon">
                <ManeuverIcon type={step.maneuverType} modifier={step.maneuverModifier} />
              </div>
              <div className="tbt-step-info">
                <span className="tbt-step-instruction">{step.instruction}</span>
                <span className="tbt-step-distance">{formatStepDistance(step.distance)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default memo(TurnByTurnPanel);
