'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Category } from '@/app/utils/mockData'
import { TravelMode, Waypoint } from '../types'
import { buildUrlWithRouteState, parseUrlRouteState } from '../utils/urlState'

type CategoryState = Category | null;

interface UseUrlSyncedRouteStateResult {
  startLocation: string;
  setStartLocation: (value: string) => void;
  destination: string;
  setDestination: (value: string) => void;
  activeCategory: CategoryState;
  setActiveCategory: (value: CategoryState) => void;
  travelMode: TravelMode;
  setTravelMode: (value: TravelMode) => void;
  waypoints: Waypoint[];
  setWaypoints: (next: Waypoint[]) => void;
}

export function useUrlSyncedRouteState(): UseUrlSyncedRouteStateResult {
  const router = useRouter();
  const pathname = usePathname();

  const initialState = useMemo(() => {
    if (typeof window === 'undefined') {
      return { start: '', destination: '', category: null as CategoryState, mode: 'driving' as TravelMode, waypoints: [] as Waypoint[] };
    }
    const parsed = parseUrlRouteState(window.location.search);
    return { ...parsed, waypoints: parsed.waypoints ?? [] };
  }, []);

  const [startLocation, setStartLocation] = useState(initialState.start);
  const [destination, setDestination] = useState(initialState.destination);
  const [activeCategory, setActiveCategory] = useState<CategoryState>(initialState.category);
  const [travelMode, setTravelMode] = useState<TravelMode>(initialState.mode);
  const [waypoints, setWaypoints] = useState<Waypoint[]>(initialState.waypoints);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const nextUrl = buildUrlWithRouteState(pathname, {
      start: startLocation,
      destination,
      category: activeCategory,
      mode: travelMode,
      ...(waypoints.length > 0 ? { waypoints } : {}),
    });

    router.replace(nextUrl, { scroll: false });
  }, [activeCategory, destination, isHydrated, pathname, router, startLocation, travelMode, waypoints]);

  return {
    startLocation,
    setStartLocation,
    destination,
    setDestination,
    activeCategory,
    setActiveCategory,
    travelMode,
    setTravelMode,
    waypoints,
    setWaypoints,
  };
}
