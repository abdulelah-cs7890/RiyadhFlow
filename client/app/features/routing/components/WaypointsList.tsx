'use client'

import { memo, useState } from 'react'
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
  const [handleDownIndex, setHandleDownIndex] = useState<number | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

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

  const reorder = (from: number, to: number) => {
    if (from === to) return
    const copy = waypoints.slice()
    const [moved] = copy.splice(from, 1)
    copy.splice(to, 0, moved)
    onChange(copy)
  }

  if (disabled && waypoints.length === 0) return null

  const canReorder = waypoints.length > 1

  return (
    <div className="waypoints-list">
      {waypoints.map((wp, i) => (
        <div
          key={i}
          className={`waypoint-row${draggedIndex === i ? ' is-dragging' : ''}${dragOverIndex === i && draggedIndex !== null && draggedIndex !== i ? ' is-drag-target' : ''}`}
          draggable={handleDownIndex === i && canReorder}
          onDragStart={(e) => {
            if (handleDownIndex !== i) { e.preventDefault(); return }
            setDraggedIndex(i)
            e.dataTransfer.effectAllowed = 'move'
            // setDragImage workaround: a transparent ghost so the row itself
            // is what visually moves with opacity styling instead of a default browser snapshot.
          }}
          onDragOver={(e) => {
            if (draggedIndex === null) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            if (dragOverIndex !== i) setDragOverIndex(i)
          }}
          onDragLeave={() => {
            if (dragOverIndex === i) setDragOverIndex(null)
          }}
          onDrop={(e) => {
            e.preventDefault()
            if (draggedIndex !== null) reorder(draggedIndex, i)
            setDraggedIndex(null)
            setDragOverIndex(null)
            setHandleDownIndex(null)
          }}
          onDragEnd={() => {
            setDraggedIndex(null)
            setDragOverIndex(null)
            setHandleDownIndex(null)
          }}
        >
          {canReorder && (
            <button
              type="button"
              className="waypoint-drag-handle"
              aria-label={tRouting('reorderStop')}
              title={tRouting('reorderStop')}
              onMouseDown={() => setHandleDownIndex(i)}
              onMouseUp={() => setHandleDownIndex(null)}
              onTouchStart={() => setHandleDownIndex(i)}
              onTouchEnd={() => setHandleDownIndex(null)}
            >
              ⋮⋮
            </button>
          )}
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
