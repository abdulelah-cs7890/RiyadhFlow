import { describe, expect, it } from 'vitest'
import {
  isNowPrayer,
  isWithinWindow,
  minutesBetween,
  nextPrayerAfter,
  parseHmToMinutes,
  type PrayerTimes,
} from '@/app/features/prayer/utils/prayerTimes'

const RIYADH_TIMES: PrayerTimes = {
  Fajr: '04:45',
  Dhuhr: '12:05',
  Asr: '15:28',
  Maghrib: '18:12',
  Isha: '19:42',
}

describe('parseHmToMinutes', () => {
  it('parses 24-hour HH:mm', () => {
    expect(parseHmToMinutes('04:45')).toBe(4 * 60 + 45)
    expect(parseHmToMinutes('19:42')).toBe(19 * 60 + 42)
  })

  it('tolerates timezone suffix from Aladhan API', () => {
    expect(parseHmToMinutes('18:12 (+03)')).toBe(18 * 60 + 12)
  })
})

describe('nextPrayerAfter', () => {
  it('returns Fajr before dawn', () => {
    const now = new Date('2026-04-22T03:00:00')
    const next = nextPrayerAfter(now, RIYADH_TIMES)
    expect(next.name).toBe('Fajr')
    expect(next.isTomorrow).toBe(false)
    expect(next.minutesUntil).toBe(105) // 04:45 - 03:00
  })

  it('returns Asr in mid-afternoon', () => {
    const now = new Date('2026-04-22T13:00:00')
    const next = nextPrayerAfter(now, RIYADH_TIMES)
    expect(next.name).toBe('Asr')
    expect(next.isTomorrow).toBe(false)
  })

  it('wraps to tomorrow\'s Fajr after Isha', () => {
    const now = new Date('2026-04-22T22:30:00')
    const next = nextPrayerAfter(now, RIYADH_TIMES)
    expect(next.name).toBe('Fajr')
    expect(next.isTomorrow).toBe(true)
    // 24*60 - (22*60+30) + (4*60+45) = 90 + 285 = 375
    expect(next.minutesUntil).toBe(375)
  })

  it('returns Dhuhr the minute Fajr passes', () => {
    const now = new Date('2026-04-22T04:46:00')
    const next = nextPrayerAfter(now, RIYADH_TIMES)
    expect(next.name).toBe('Dhuhr')
  })
})

describe('isWithinWindow', () => {
  it('is true within the window, false before', () => {
    const before = new Date('2026-04-22T17:45:00')
    expect(isWithinWindow(before, '18:12', 30)).toBe(true)  // 27 min before
    expect(isWithinWindow(before, '18:12', 20)).toBe(false) // outside 20 min
  })

  it('is false after the prayer time has passed', () => {
    const after = new Date('2026-04-22T18:20:00')
    expect(isWithinWindow(after, '18:12', 20)).toBe(false)
  })
})

describe('minutesBetween', () => {
  it('computes signed minutes', () => {
    expect(minutesBetween(new Date('2026-04-22T12:00:00'), '12:05')).toBe(5)
    expect(minutesBetween(new Date('2026-04-22T12:10:00'), '12:05')).toBe(-5)
  })
})

describe('isNowPrayer', () => {
  it('matches when inside the post-window of a prayer', () => {
    const now = new Date('2026-04-22T18:20:00') // 8 min after Maghrib
    expect(isNowPrayer(now, RIYADH_TIMES, 20)).toBe('Maghrib')
  })

  it('returns null outside prayer windows', () => {
    const now = new Date('2026-04-22T14:00:00')
    expect(isNowPrayer(now, RIYADH_TIMES, 20)).toBeNull()
  })
})
