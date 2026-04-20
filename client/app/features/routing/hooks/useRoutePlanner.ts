'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getCoordinates } from '../services/geocoding'
import { buildTrafficInsight, TrafficInsight } from '../utils/trafficInsights'
import { planTransitTrip, TransitPlan } from '../services/transitRouting'
import { RouteInfo, TravelMode } from '../types'

type RouteCoordinates = { start: number[]; end: number[] } | null;

export type TransitStatus =
  | { kind: 'none' }
  | { kind: 'ready'; plan: TransitPlan }
  | { kind: 'no-route'; nearestStationKm: number | null };

interface FindRouteOptions {
  start?: [number, number];
  end?: [number, number];
  travelMode?: TravelMode;
}

interface UseRoutePlannerResult {
  routeCoords: RouteCoordinates;
  routeInfo: RouteInfo | null;
  insights: TrafficInsight | null;
  transit: TransitStatus;
  isCalculating: boolean;
  error: string | null;
  findRoute: (start: string, destination: string, preResolved?: FindRouteOptions) => Promise<void>;
  handleRouteFetched: (info: RouteInfo) => void;
  resetRoute: () => void;
  clearError: () => void;
}

export function useRoutePlanner(): UseRoutePlannerResult {
  const t = useTranslations('errors');
  const [routeCoords, setRouteCoords] = useState<RouteCoordinates>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [insights, setInsights] = useState<TrafficInsight | null>(null);
  const [transit, setTransit] = useState<TransitStatus>({ kind: 'none' });
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const findRoute = async (
    start: string,
    destination: string,
    preResolved?: FindRouteOptions,
  ) => {
    if (!start || !destination) {
      setError(t('enterBoth'));
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setError(null);
    setIsCalculating(true);
    setInsights(null);
    setRouteInfo(null);
    setTransit({ kind: 'none' });

    try {
      const [startCoords, destinationCoords] = await Promise.all([
        preResolved?.start
          ? Promise.resolve(preResolved.start)
          : getCoordinates(start, controller.signal),
        preResolved?.end
          ? Promise.resolve(preResolved.end)
          : getCoordinates(destination, controller.signal),
      ]);

      if (!startCoords) {
        setError(t('notFoundStart', { name: start }));
        setIsCalculating(false);
        return;
      }

      if (!destinationCoords) {
        setError(t('notFoundDest', { name: destination }));
        setIsCalculating(false);
        return;
      }

      setRouteCoords({ start: startCoords, end: destinationCoords });

      if (preResolved?.travelMode === 'metro') {
        const result = planTransitTrip(
          [startCoords[0], startCoords[1]],
          [destinationCoords[0], destinationCoords[1]],
        );
        if (result.kind === 'route') {
          setTransit({ kind: 'ready', plan: result });
        } else {
          setTransit({ kind: 'no-route', nearestStationKm: result.nearestStationKm });
        }
        setIsCalculating(false);
        // Metro mode renders its own summary (no Mapbox Directions call will fire).
        return;
      }
      // Non-metro: isCalculating stays true — Map.tsx calls handleRouteFetched when directions arrive.
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(t('generic'));
      setIsCalculating(false);
    }
  };

  // Stable ref — safe to pass directly as onRouteFetched to Map without inline wrapper
  const handleRouteFetched = useCallback((info: RouteInfo) => {
    setRouteInfo(info);
    setIsCalculating(false);
    setInsights(buildTrafficInsight(info.duration, info.duration_typical));
  }, []);

  const resetRoute = useCallback(() => {
    abortControllerRef.current?.abort();
    setRouteCoords(null);
    setRouteInfo(null);
    setInsights(null);
    setTransit({ kind: 'none' });
    setError(null);
    setIsCalculating(false);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    routeCoords,
    routeInfo,
    insights,
    transit,
    isCalculating,
    error,
    findRoute,
    handleRouteFetched,
    resetRoute,
    clearError,
  };
}
