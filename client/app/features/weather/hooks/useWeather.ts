'use client'

import { useEffect, useRef, useState } from 'react'
import { fetchWeather } from '../services/weather'
import type { WeatherSnapshot } from '../utils/weather'

const STORAGE_KEY = 'riyadhFlowWeather'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 min

interface CacheEntry {
  ts: number
  snapshot: WeatherSnapshot
}

function readCache(): WeatherSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (Date.now() - entry.ts < CACHE_TTL_MS && entry.snapshot) return entry.snapshot
  } catch { /* corrupt */ }
  return null
}

function writeCache(snapshot: WeatherSnapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now(), snapshot }))
  } catch { /* quota */ }
}

export interface UseWeatherResult {
  weather: WeatherSnapshot | null
  isLoading: boolean
  error: string | null
}

export function useWeather(): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const cached = readCache()
    if (cached) {
      setWeather(cached)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    fetchWeather(controller.signal)
      .then((snap) => {
        if (!snap) {
          setError('invalid-response')
          return
        }
        setWeather(snap)
        writeCache(snap)
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setError('fetch-failed')
      })
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [])

  return { weather, isLoading, error }
}
