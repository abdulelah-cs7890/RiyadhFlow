'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Trip } from './useSavedTrips'

const STORAGE_KEY = 'riyadhFlowRecentTrips'
const MAX_RECENTS = 5

interface UseRecentTripsResult {
  recents: Trip[];
  recordRecent: (
    start: string,
    destination: string,
    startCoords?: [number, number] | null,
    destCoords?: [number, number] | null,
  ) => void;
  clearRecents: () => void;
}

function persist(next: Trip[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* quota */ }
}

export function useRecentTrips(): UseRecentTripsResult {
  const [recents, setRecents] = useState<Trip[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setRecents(JSON.parse(stored) as Trip[])
    } catch {
      // corrupted — start fresh
    }
  }, [])

  const recordRecent = useCallback((
    start: string,
    destination: string,
    startCoords?: [number, number] | null,
    destCoords?: [number, number] | null,
  ) => {
    if (!start || !destination) return
    setRecents((prev) => {
      const filtered = prev.filter((t) => !(t.start === start && t.dest === destination))
      const entry: Trip = {
        id: crypto.randomUUID(),
        start,
        dest: destination,
        ...(startCoords ? { startCoords } : {}),
        ...(destCoords ? { destCoords } : {}),
      }
      const next = [entry, ...filtered].slice(0, MAX_RECENTS)
      persist(next)
      return next
    })
  }, [])

  const clearRecents = useCallback(() => {
    setRecents([])
    persist([])
  }, [])

  return { recents, recordRecent, clearRecents }
}
