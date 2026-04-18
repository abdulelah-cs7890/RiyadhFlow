'use client'

import { useEffect, useState } from 'react'
import { Category, PlaceData } from '@/app/utils/mockData'
import { fetchPlacesByCategory } from '../services/placesSearch'

interface UsePlacesResult {
  places: PlaceData[];
  isLoading: boolean;
}

export function usePlaces(activeCategory: Category | null): UsePlacesResult {
  const [places, setPlaces] = useState<PlaceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!activeCategory) {
      setPlaces([]);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    fetchPlacesByCategory(activeCategory, controller.signal)
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
  }, [activeCategory]);

  return { places, isLoading };
}
