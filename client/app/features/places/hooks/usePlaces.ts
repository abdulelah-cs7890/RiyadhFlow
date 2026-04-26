'use client'

import { useEffect, useState } from 'react'
import { Category, PlaceData } from '@/app/utils/mockData'
import { fetchPlacesFromDb } from '../services/placesSearch'

interface UsePlacesResult {
  places: PlaceData[];
  isLoading: boolean;
}

export function usePlaces(
  activeCategory: Category | null,
  userLocation?: [number, number] | null,
): UsePlacesResult {
  const [places, setPlaces] = useState<PlaceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const lng = userLocation?.[0];
  const lat = userLocation?.[1];
  const hasLocation = lat != null && lng != null;

  useEffect(() => {
    if (!activeCategory && !hasLocation) {
      setPlaces([]);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    const opts = hasLocation ? { lat: lat!, lng: lng! } : undefined;
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
  }, [activeCategory, lat, lng, hasLocation]);

  return { places, isLoading };
}
