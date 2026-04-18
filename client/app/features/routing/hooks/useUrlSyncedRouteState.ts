'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Category } from '@/app/utils/mockData'
import { TravelMode } from '../types'
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
}

export function useUrlSyncedRouteState(): UseUrlSyncedRouteStateResult {
  const router = useRouter();
  const pathname = usePathname();

  const initialState = useMemo(() => {
    if (typeof window === 'undefined') {
      return { start: '', destination: '', category: null as CategoryState, mode: 'driving' as TravelMode };
    }
    return parseUrlRouteState(window.location.search);
  }, []);

  const [startLocation, setStartLocation] = useState(initialState.start);
  const [destination, setDestination] = useState(initialState.destination);
  const [activeCategory, setActiveCategory] = useState<CategoryState>(initialState.category);
  const [travelMode, setTravelMode] = useState<TravelMode>(initialState.mode);
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
    });

    router.replace(nextUrl, { scroll: false });
  }, [activeCategory, destination, isHydrated, pathname, router, startLocation, travelMode]);

  return {
    startLocation,
    setStartLocation,
    destination,
    setDestination,
    activeCategory,
    setActiveCategory,
    travelMode,
    setTravelMode,
  };
}
