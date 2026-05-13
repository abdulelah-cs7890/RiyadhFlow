'use client'

import { useEffect, useState } from 'react'
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

  // IMPORTANT: initial state must match SSR. Reading window.location.search
  // here would cause a hydration mismatch on any URL with route state
  // (e.g., after the user clicks a category and refreshes). We initialize
  // with empty defaults and hydrate from the URL in a post-mount effect.
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryState>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>('driving');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Post-hydration: pull any state encoded in the URL into local state.
    const parsed = parseUrlRouteState(window.location.search);
    if (parsed.start) setStartLocation(parsed.start);
    if (parsed.destination) setDestination(parsed.destination);
    if (parsed.category) setActiveCategory(parsed.category);
    if (parsed.mode) setTravelMode(parsed.mode);
    if (parsed.waypoints && parsed.waypoints.length > 0) setWaypoints(parsed.waypoints);
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
