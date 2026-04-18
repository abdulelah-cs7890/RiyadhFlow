'use client'

import { memo } from 'react'

interface ManeuverIconProps {
  type: string;
  modifier?: string;
}

function getRotation(type: string, modifier?: string): number {
  if (type === 'depart') return 0;
  if (type === 'arrive') return 180;
  if (!modifier) return 0;

  switch (modifier) {
    case 'left': return -90;
    case 'slight left': return -45;
    case 'sharp left': return -135;
    case 'right': return 90;
    case 'slight right': return 45;
    case 'sharp right': return 135;
    case 'uturn': return 180;
    default: return 0;
  }
}

function ManeuverIcon({ type, modifier }: ManeuverIconProps) {
  if (type === 'arrive') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="maneuver-icon" aria-hidden="true">
        <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.2"/>
        <circle cx="12" cy="12" r="3" fill="currentColor"/>
      </svg>
    );
  }

  if (type === 'depart') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="maneuver-icon" aria-hidden="true">
        <circle cx="12" cy="18" r="3" fill="currentColor" opacity="0.3"/>
        <path d="M12 14V4m0 0l-3 3m3-3l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  if (type === 'roundabout' || type === 'rotary') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="maneuver-icon" aria-hidden="true">
        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 7V2m0 0l-2 2m2-2l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  // Default: arrow rotated by modifier
  const rotation = getRotation(type, modifier);

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className="maneuver-icon"
      aria-hidden="true"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <path d="M12 19V5m0 0l-5 5m5-5l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default memo(ManeuverIcon);
