'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { planTransitTrip } from '../services/transitRouting'
import type { TravelMode, Waypoint } from '../types'

export interface ModeEta {
  mins: number;
  km: number;
}

export type EtaResult = ModeEta | null;

export interface AllModeEtas {
  driving: EtaResult;
  walking: EtaResult;
  cycling: EtaResult;
  metro: EtaResult;
  isLoading: boolean;
}

const EMPTY: AllModeEtas = {
  driving: null, walking: null, cycling: null, metro: null, isLoading: false,
}

const MAPBOX_PROFILE: Record<Exclude<TravelMode, 'metro'>, string> = {
  driving: 'driving',
  walking: 'walking',
  cycling: 'cycling',
}

interface DirectionsRoute {
  distance: number;
  duration: number;
}

async function fetchOneEta(
  profile: string,
  start: [number, number],
  end: [number, number],
  waypoints: [number, number][],
  signal: AbortSignal,
): Promise<EtaResult> {
  const token = mapboxgl.accessToken
  if (!token) return null
  const middle = waypoints.map((c) => `${c[0]},${c[1]}`).join(';')
  const path = middle
    ? `${start[0]},${start[1]};${middle};${end[0]},${end[1]}`
    : `${start[0]},${start[1]};${end[0]},${end[1]}`
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${path}?overview=false&geometries=geojson&access_token=${token}`
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const json = (await res.json()) as { routes?: DirectionsRoute[] }
    const route = json.routes?.[0]
    if (!route) return null
    return { mins: Math.round(route.duration / 60), km: route.distance / 1000 }
  } catch {
    return null
  }
}

export function useAllModeEtas(
  start: [number, number] | null | undefined,
  end: [number, number] | null | undefined,
  waypoints: Waypoint[],
): AllModeEtas {
  const [state, setState] = useState<AllModeEtas>(EMPTY)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!start || !end) {
      setState(EMPTY)
      return
    }

    const wpCoords = waypoints
      .map((w) => w.coords)
      .filter((c): c is [number, number] => c !== null)

    setState((prev) => ({ ...prev, isLoading: true }))

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController()
      abortRef.current = controller

      const metroPromise: Promise<{ kind: 'route'; totalMinutes: number } | { kind: 'no-route' }> =
        wpCoords.length === 0
          ? planTransitTrip(start, end).then((plan) => plan.kind === 'route'
            ? { kind: 'route' as const, totalMinutes: plan.totalMinutes }
            : { kind: 'no-route' as const })
          : Promise.resolve({ kind: 'no-route' as const })

      Promise.all([
        fetchOneEta(MAPBOX_PROFILE.driving, start, end, wpCoords, controller.signal),
        fetchOneEta(MAPBOX_PROFILE.walking, start, end, wpCoords, controller.signal),
        fetchOneEta(MAPBOX_PROFILE.cycling, start, end, wpCoords, controller.signal),
        metroPromise,
      ]).then(([driving, walking, cycling, metroPlan]) => {
        if (controller.signal.aborted) return
        const metro: EtaResult = metroPlan.kind === 'route'
          ? { mins: Math.round(metroPlan.totalMinutes), km: 0 }
          : null
        setState({ driving, walking, cycling, metro, isLoading: false })
      })
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
    // We deliberately stringify coords to avoid tuple-identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start?.[0], start?.[1], end?.[0], end?.[1], waypoints.length])

  return state
}
