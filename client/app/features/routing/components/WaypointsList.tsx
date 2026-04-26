'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import AutocompleteInput from './AutocompleteInput'
import { MAX_WAYPOINTS, Waypoint } from '../types'

interface WaypointsListProps {
  waypoints: Waypoint[];
  onChange: (next: Waypoint[]) => void;
  onSubmit?: () => void;
  anchorCoords?: [number, number] | null;
  disabled?: boolean;
}

function WaypointsList({
  waypoints,
  onChange,
  onSubmit,
  anchorCoords,
  disabled = false,
}: WaypointsListProps) {
  const tRouting = useTranslations('routing')

  const updateAt = (index: number, next: Waypoint) => {
    const copy = waypoints.slice()
    copy[index] = next
    onChange(copy)
  }

  const removeAt = (index: number) => {
    onChange(waypoints.filter((_, i) => i !== index))
  }

  const addStop = () => {
    if (waypoints.length >= MAX_WAYPOINTS) return
    onChange([...waypoints, { name: '', coords: null }])
  }

  if (disabled && waypoints.length === 0) return null

  return (
    <div className="waypoints-list">
      {waypoints.map((wp, i) => (
        <div key={i} className="waypoint-row">
          <AutocompleteInput
            value={wp.name}
            onChange={(v) => updateAt(i, { name: v, coords: null })}
            onSelect={(name, coords) => updateAt(i, { name, coords })}
            placeholder={tRouting('stopPlaceholder')}
            label={tRouting('stopLabel', { n: i + 1 })}
            icon="🛑"
            onSubmit={onSubmit}
            anchorCoords={anchorCoords}
          />
          <button
            type="button"
            className="waypoint-remove-btn"
            onClick={() => removeAt(i)}
            aria-label={tRouting('removeStop')}
            title={tRouting('removeStop')}
          >
            ✕
          </button>
        </div>
      ))}
      {!disabled && waypoints.length < MAX_WAYPOINTS && (
        <button
          type="button"
          className="waypoint-add-btn"
          onClick={addStop}
        >
          + {tRouting('addStop')}
        </button>
      )}
    </div>
  )
}

export default memo(WaypointsList)
