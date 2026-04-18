'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getCoordinates } from '../services/geocoding'
import { buildTrafficInsight, TrafficInsight } from '../utils/trafficInsights'
import { RouteInfo } from '../types'

type RouteCoordinates = { start: number[]; end: number[] } | null;

interface UseRoutePlannerResult {
  routeCoords: RouteCoordinates;
  routeInfo: RouteInfo | null;
  insights: TrafficInsight | null;
  isCalculating: boolean;
  error: string | null;
  findRoute: (start: string, destination: string, preResolved?: { start?: [number, number]; end?: [number, number] }) => Promise<void>;
  handleRouteFetched: (info: RouteInfo) => void;
  resetRoute: () => void;
  clearError: () => void;
}

export function useRoutePlanner(): UseRoutePlannerResult {
  const t = useTranslations('errors');
  const [routeCoords, setRouteCoords] = useState<RouteCoordinates>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [insights, setInsights] = useState<TrafficInsight | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const findRoute = async (
    start: string,
    destination: string,
    preResolved?: { start?: [number, number]; end?: [number, number] },
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
      // isCalculating stays true — Map.tsx calls handleRouteFetched when directions arrive
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
    setInsights(buildTrafficInsight(new Date(), info.duration, info.duration_typical));
  }, []);

  const resetRoute = useCallback(() => {
    abortControllerRef.current?.abort();
    setRouteCoords(null);
    setRouteInfo(null);
    setInsights(null);
    setError(null);
    setIsCalculating(false);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    routeCoords,
    routeInfo,
    insights,
    isCalculating,
    error,
    findRoute,
    handleRouteFetched,
    resetRoute,
    clearError,
  };
}
