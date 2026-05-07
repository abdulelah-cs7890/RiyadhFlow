'use client'

import { useEffect, useRef, useState } from 'react'
import {
  isNowPrayer,
  nextPrayerAfter,
  type HijriDate,
  type NextPrayer,
  type PrayerName,
  type PrayerTimes,
} from '../utils/prayerTimes'

const STORAGE_KEY = 'riyadhFlowPrayerTimes'
// Riyadh — centered on the KAFD area. One fetch covers the whole city.
const RIYADH_LAT = 24.7136
const RIYADH_LNG = 46.6753
// Method 4 = Umm Al-Qura University (Mecca) — the official Saudi calculation.
const METHOD = 4

function todayKey(): string {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

interface AladhanResponse {
  data: {
    timings: Record<string, string>
    date?: {
      hijri?: {
        day?: string
        year?: string
        month?: { en?: string; ar?: string }
      }
    }
  }
}

function extractTimes(json: AladhanResponse): PrayerTimes | null {
  const t = json?.data?.timings
  if (!t) return null
  const required: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
  for (const key of required) if (!t[key]) return null
  return {
    Fajr: t.Fajr,
    Dhuhr: t.Dhuhr,
    Asr: t.Asr,
    Maghrib: t.Maghrib,
    Isha: t.Isha,
  }
}

function extractHijri(json: AladhanResponse): HijriDate | null {
  const h = json?.data?.date?.hijri
  if (!h?.day || !h?.year || !h?.month?.en || !h?.month?.ar) return null
  return {
    day: h.day,
    year: h.year,
    monthEn: h.month.en,
    monthAr: h.month.ar,
  }
}

interface CacheEntry {
  dateKey: string
  times: PrayerTimes
  hijri?: HijriDate | null
}

interface CachedPayload {
  times: PrayerTimes
  hijri: HijriDate | null
}

function readCache(dateKey: string): CachedPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (entry.dateKey === dateKey && entry.times) {
      return { times: entry.times, hijri: entry.hijri ?? null }
    }
  } catch { /* corrupt */ }
  return null
}

function writeCache(dateKey: string, times: PrayerTimes, hijri: HijriDate | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dateKey, times, hijri }))
  } catch { /* quota */ }
}

export interface UsePrayerTimesResult {
  times: PrayerTimes | null
  hijri: HijriDate | null
  next: NextPrayer | null
  nowPrayer: PrayerName | null
  isLoading: boolean
  error: string | null
}

export function usePrayerTimes(): UsePrayerTimesResult {
  const [times, setTimes] = useState<PrayerTimes | null>(null)
  const [hijri, setHijri] = useState<HijriDate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [tick, setTick] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const dateKey = todayKey()
    const cached = readCache(dateKey)
    if (cached) {
      setTimes(cached.times)
      setHijri(cached.hijri)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    const url = `https://api.aladhan.com/v1/timings/${dateKey}?latitude=${RIYADH_LAT}&longitude=${RIYADH_LNG}&method=${METHOD}`
    fetch(url, { signal: controller.signal })
      .then((r) => r.json() as Promise<AladhanResponse>)
      .then((json) => {
        const parsed = extractTimes(json)
        if (!parsed) {
          setError('invalid-response')
          return
        }
        const parsedHijri = extractHijri(json)
        setTimes(parsed)
        setHijri(parsedHijri)
        writeCache(dateKey, parsed, parsedHijri)
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setError('fetch-failed')
      })
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [])

  // Re-compute next-prayer every 60 s so the countdown stays fresh without
  // thrashing the render pipeline.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const next = times ? nextPrayerAfter(new Date(), times) : null
  const nowPrayer = times ? isNowPrayer(new Date(), times, 20) : null
  void tick // referenced to keep the interval wired into the next-prayer recompute

  return { times, hijri, next, nowPrayer, isLoading, error }
}
