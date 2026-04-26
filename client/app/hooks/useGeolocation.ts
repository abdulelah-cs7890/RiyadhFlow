'use client'

import { useCallback, useState } from 'react'

export type GeoStatus = 'idle' | 'loading' | 'error'
export type GeoErrorCode = 1 | 2 | 3

export interface UseGeolocationResult {
  coords: [number, number] | null
  status: GeoStatus
  errorCode: GeoErrorCode | null
  request: () => void
  clear: () => void
}

export function useGeolocation(): UseGeolocationResult {
  const [coords, setCoords] = useState<[number, number] | null>(null)
  const [status, setStatus] = useState<GeoStatus>('idle')
  const [errorCode, setErrorCode] = useState<GeoErrorCode | null>(null)

  const request = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setStatus('error')
      setErrorCode(2)
      return
    }
    setStatus('loading')
    setErrorCode(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords([pos.coords.longitude, pos.coords.latitude])
        setStatus('idle')
      },
      (err) => {
        setStatus('error')
        setErrorCode(err.code as GeoErrorCode)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  const clear = useCallback(() => {
    setCoords(null)
    setStatus('idle')
    setErrorCode(null)
  }, [])

  return { coords, status, errorCode, request, clear }
}
