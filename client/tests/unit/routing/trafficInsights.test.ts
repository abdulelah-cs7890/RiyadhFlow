import { describe, expect, it } from 'vitest'
import { buildTrafficInsight } from '@/app/features/routing/utils/trafficInsights'

describe('buildTrafficInsight', () => {
  it('returns delayMins=0 when duration matches typical', () => {
    expect(buildTrafficInsight(600, 600).delayMins).toBe(0)
  })

  it('calculates delay minutes from API durations', () => {
    // 1200s actual vs 600s typical = 10 min delay
    expect(buildTrafficInsight(1200, 600).delayMins).toBe(10)
  })

  it('clamps negative deltas to 0 (live faster than typical)', () => {
    expect(buildTrafficInsight(500, 600).delayMins).toBe(0)
  })

  it('returns delayMins=0 when either duration is missing', () => {
    expect(buildTrafficInsight(undefined, 600).delayMins).toBe(0)
    expect(buildTrafficInsight(600, undefined).delayMins).toBe(0)
    expect(buildTrafficInsight().delayMins).toBe(0)
  })
})
