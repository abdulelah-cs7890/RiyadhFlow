'use client'

import { useEffect, useState } from 'react'

export interface Trip {
  id: string;
  start: string;
  dest: string;
  startCoords?: [number, number];
  destCoords?: [number, number];
}

const STORAGE_KEY = 'riyadhFlowTrips';

interface UseSavedTripsResult {
  trips: Trip[];
  saveTrip: (
    start: string,
    destination: string,
    startCoords?: [number, number] | null,
    destCoords?: [number, number] | null,
  ) => boolean;
  deleteTrip: (idToRemove: string) => void;
}

export function useSavedTrips(): UseSavedTripsResult {
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    try {
      const storedTrips = localStorage.getItem(STORAGE_KEY);
      if (storedTrips) {
        setTrips(JSON.parse(storedTrips) as Trip[]);
      }
    } catch {
      // Corrupted localStorage data — start fresh
    }
  }, []);

  const saveTrip = (
    start: string,
    destination: string,
    startCoords?: [number, number] | null,
    destCoords?: [number, number] | null,
  ) => {
    if (!start || !destination) return false;

    const isDuplicate = trips.some(
      (t) => t.start === start && t.dest === destination,
    );
    if (isDuplicate) return false;

    const newTrip: Trip = {
      id: crypto.randomUUID(),
      start,
      dest: destination,
      ...(startCoords ? { startCoords } : {}),
      ...(destCoords ? { destCoords } : {}),
    };

    const updated = [...trips, newTrip];
    setTrips(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* quota exceeded */ }
    return true;
  };

  const deleteTrip = (idToRemove: string) => {
    const updated = trips.filter((trip) => trip.id !== idToRemove);
    setTrips(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* quota exceeded */ }
  };

  return { trips, saveTrip, deleteTrip };
}
