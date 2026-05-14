'use client'

import { useEffect, useState } from 'react'
import { Category, PlaceData } from '@/app/utils/mockData'
import { fetchPlacesFromDb } from '../services/placesSearch'

interface UsePlacesResult {
  places: PlaceData[];
  isLoading: boolean;
}

// Riyadh city center. Used as the proximity reference when no user location
// has been granted, so the map ships with a default set of places visible
// instead of looking empty until the user clicks a category.
const RIYADH_CENTER_LNG = 46.6753;
const RIYADH_CENTER_LAT = 24.7136;
const DEFAULT_BROWSE_RADIUS_M = 8000;

export function usePlaces(
  activeCategory: Category | null,
  userLocation?: [number, number] | null,
  routeActive: boolean = false,
): UsePlacesResult {
  const [places, setPlaces] = useState<PlaceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const lng = userLocation?.[0];
  const lat = userLocation?.[1];
  const hasLocation = lat != null && lng != null;

  useEffect(() => {
    // Suppress the default exploration set once the user has computed a
    // route. They've moved on from browsing — the markers would just clutter
    // the route view. Picking a category or "Near Me" brings places back.
    const isDefaultMode = !activeCategory && !hasLocation;
    if (isDefaultMode && routeActive) {
      setPlaces([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    // Three remaining modes:
    //   1. Category active (with or without user location) — fetch that category, ordered by distance from user/center.
    //   2. User location but no category — fetch nearby places of any category.
    //   3. Neither AND no active route — fetch the default exploration set
    //      near Riyadh center so the map isn't empty on first paint.
    const opts = hasLocation
      ? { lat: lat!, lng: lng! }
      : { lat: RIYADH_CENTER_LAT, lng: RIYADH_CENTER_LNG, radius: DEFAULT_BROWSE_RADIUS_M };

    fetchPlacesFromDb(activeCategory, opts, controller.signal)
      .then((results) => {
        setPlaces(results);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('usePlaces error:', err);
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [activeCategory, lat, lng, hasLocation, routeActive]);

  return { places, isLoading };
}
