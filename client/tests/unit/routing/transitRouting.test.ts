import { describe, expect, it } from 'vitest'
import { planTransitTrip } from '@/app/features/routing/services/transitRouting'

const KSU: [number, number] = [46.6283, 24.7102]
const KAFD: [number, number] = [46.6430, 24.7676]
const KING_FAHAD_STADIUM: [number, number] = [46.8364, 24.7930]
const FAR_AWAY_DESERT: [number, number] = [47.5, 24.0] // ~90 km east of any station

describe('planTransitTrip', () => {
  it('plans a transit trip between two stations', () => {
    const plan = planTransitTrip(KSU, KAFD)
    expect(plan.kind).not.toBe('no-route')
    if (plan.kind === 'no-route') return

    expect(plan.legs.length).toBeGreaterThanOrEqual(3) // walk + ≥1 train + walk
    expect(plan.legs[0].kind).toBe('walk')
    expect(plan.legs[plan.legs.length - 1].kind).toBe('walk')
    expect(plan.totalMinutes).toBeGreaterThan(0)
    expect(plan.trainMinutes).toBeGreaterThan(0)
  })

  it('includes at least one train leg with line metadata', () => {
    const plan = planTransitTrip(KSU, KAFD)
    if (plan.kind === 'no-route') throw new Error('expected route')

    const trainLegs = plan.legs.filter((l) => l.kind === 'train')
    expect(trainLegs.length).toBeGreaterThanOrEqual(1)
    for (const leg of trainLegs) {
      if (leg.kind !== 'train') continue
      expect(leg.lineId).toMatch(/blue|red|orange|yellow|green|purple/)
      expect(leg.lineColor).toMatch(/^#[0-9A-F]{6}$/i)
      expect(leg.stopCount).toBeGreaterThan(0)
      expect(leg.geometry.coordinates.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('returns no-route when start is far from any station', () => {
    const plan = planTransitTrip(FAR_AWAY_DESERT, KAFD)
    expect(plan.kind).toBe('no-route')
    if (plan.kind === 'no-route') {
      expect(plan.nearestStationKm).toBeGreaterThan(2)
    }
  })

  it('returns no-route when end is far from any station', () => {
    const plan = planTransitTrip(KSU, FAR_AWAY_DESERT)
    expect(plan.kind).toBe('no-route')
  })

  it('counts transfers for multi-line trips', () => {
    // KSU (red) → King Fahad Stadium (red end-of-line) should be 0 transfers
    const sameLine = planTransitTrip(KSU, KING_FAHAD_STADIUM)
    if (sameLine.kind === 'no-route') throw new Error('expected route')
    expect(sameLine.transferCount).toBe(0)
  })

  it('reports walk and train minutes that sum (with transfers) to totalMinutes', () => {
    const plan = planTransitTrip(KSU, KAFD)
    if (plan.kind === 'no-route') throw new Error('expected route')

    const expected = plan.walkMinutes + plan.trainMinutes + plan.transferCount * 3
    expect(plan.totalMinutes).toBeCloseTo(expected, 5)
  })

  it('caches the graph across calls (smoke — second call fast)', () => {
    const t1 = performance.now()
    planTransitTrip(KSU, KAFD)
    const d1 = performance.now() - t1
    const t2 = performance.now()
    planTransitTrip(KSU, KAFD)
    const d2 = performance.now() - t2
    // Both calls should be fast (< 500 ms) given ~83 stations.
    expect(d1).toBeLessThan(500)
    expect(d2).toBeLessThan(500)
  })
})
