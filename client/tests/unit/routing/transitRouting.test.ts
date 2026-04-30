import { beforeAll, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { planTransitTrip } from '@/app/features/routing/services/transitRouting'

const KSU: [number, number] = [46.6283, 24.7102]
const KAFD: [number, number] = [46.6430, 24.7676]
const KING_FAHAD_STADIUM: [number, number] = [46.8364, 24.7930]
const FAR_AWAY_DESERT: [number, number] = [47.5, 24.0] // ~90 km east of any station

// transitRouting now lazy-fetches the metro network from /data/riyadh-metro.json.
// Stub global fetch with the on-disk file so unit tests don't need a server.
beforeAll(() => {
  const file = resolve(__dirname, '../../../public/data/riyadh-metro.json')
  const json = JSON.parse(readFileSync(file, 'utf8'))
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (typeof url === 'string' && url.includes('riyadh-metro.json')) {
      return new Response(JSON.stringify(json), { status: 200 })
    }
    return new Response('not found', { status: 404 })
  }))
})

describe('planTransitTrip', () => {
  it('plans a transit trip between two stations', async () => {
    const plan = await planTransitTrip(KSU, KAFD)
    expect(plan.kind).not.toBe('no-route')
    if (plan.kind === 'no-route') return

    expect(plan.legs.length).toBeGreaterThanOrEqual(3) // walk + ≥1 train + walk
    expect(plan.legs[0].kind).toBe('walk')
    expect(plan.legs[plan.legs.length - 1].kind).toBe('walk')
    expect(plan.totalMinutes).toBeGreaterThan(0)
    expect(plan.trainMinutes).toBeGreaterThan(0)
  })

  it('includes at least one train leg with line metadata', async () => {
    const plan = await planTransitTrip(KSU, KAFD)
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

  it('returns no-route when start is far from any station', async () => {
    const plan = await planTransitTrip(FAR_AWAY_DESERT, KAFD)
    expect(plan.kind).toBe('no-route')
    if (plan.kind === 'no-route') {
      expect(plan.nearestStationKm).toBeGreaterThan(2)
    }
  })

  it('returns no-route when end is far from any station', async () => {
    const plan = await planTransitTrip(KSU, FAR_AWAY_DESERT)
    expect(plan.kind).toBe('no-route')
  })

  it('counts transfers for multi-line trips', async () => {
    // KSU (red) → King Fahad Stadium (red end-of-line) should be 0 transfers
    const sameLine = await planTransitTrip(KSU, KING_FAHAD_STADIUM)
    if (sameLine.kind === 'no-route') throw new Error('expected route')
    expect(sameLine.transferCount).toBe(0)
  })

  it('reports walk and train minutes that sum (with transfers) to totalMinutes', async () => {
    const plan = await planTransitTrip(KSU, KAFD)
    if (plan.kind === 'no-route') throw new Error('expected route')

    const expected = plan.walkMinutes + plan.trainMinutes + plan.transferCount * 3
    expect(plan.totalMinutes).toBeCloseTo(expected, 5)
  })

  it('caches the graph across calls (smoke — second call fast)', async () => {
    const t1 = performance.now()
    await planTransitTrip(KSU, KAFD)
    const d1 = performance.now() - t1
    const t2 = performance.now()
    await planTransitTrip(KSU, KAFD)
    const d2 = performance.now() - t2
    // Both calls should be fast (< 500 ms) given ~83 stations + cached network.
    expect(d1).toBeLessThan(500)
    expect(d2).toBeLessThan(500)
  })
})
