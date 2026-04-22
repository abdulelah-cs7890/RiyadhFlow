import { describe, expect, it } from 'vitest'
import { camerasOnRoute, countCamerasOnRoute, SpeedCamera } from '@/app/features/routing/utils/speedCameras'

// Straight line running east along lat ~24.7 between lng 46.70 and 46.71 (≈ 1 km).
const ROUTE: Array<[number, number]> = [
  [46.70, 24.70],
  [46.71, 24.70],
]

describe('speedCameras', () => {
  it('returns empty for empty inputs', () => {
    expect(camerasOnRoute([], [{ id: '1', lng: 46.70, lat: 24.70 }])).toEqual([])
    expect(camerasOnRoute(ROUTE, [])).toEqual([])
  })

  it('includes a camera directly on the route', () => {
    const cameras: SpeedCamera[] = [{ id: 'on', lng: 46.705, lat: 24.70 }]
    expect(camerasOnRoute(ROUTE, cameras)).toHaveLength(1)
  })

  it('excludes a camera far from the route', () => {
    // ~1 km north of the route (0.01° lat ≈ 1.11 km)
    const cameras: SpeedCamera[] = [{ id: 'far', lng: 46.705, lat: 24.71 }]
    expect(camerasOnRoute(ROUTE, cameras, 40)).toHaveLength(0)
  })

  it('includes only cameras within the threshold', () => {
    const cameras: SpeedCamera[] = [
      { id: 'close', lng: 46.705, lat: 24.70 },       // on the line
      { id: 'far', lng: 46.705, lat: 24.72 },         // ~2.2 km off
    ]
    const matched = camerasOnRoute(ROUTE, cameras, 40)
    expect(matched.map((c) => c.id)).toEqual(['close'])
  })

  it('countCamerasOnRoute agrees with camerasOnRoute length', () => {
    const cameras: SpeedCamera[] = [
      { id: 'a', lng: 46.702, lat: 24.70 },
      { id: 'b', lng: 46.708, lat: 24.70 },
      { id: 'c', lng: 46.70, lat: 24.73 },
    ]
    expect(countCamerasOnRoute(ROUTE, cameras, 40)).toBe(2)
  })

  it('honors a wider threshold', () => {
    // ~11 m off the route (~0.0001° lat)
    const cameras: SpeedCamera[] = [{ id: 'near', lng: 46.705, lat: 24.7001 }]
    expect(countCamerasOnRoute(ROUTE, cameras, 5)).toBe(0)
    expect(countCamerasOnRoute(ROUTE, cameras, 40)).toBe(1)
  })
})
