import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRecentTrips } from '@/app/features/trips/hooks/useRecentTrips'

const STORAGE_KEY = 'riyadhFlowRecentTrips'

function installLocalStorageShim() {
  const store: Record<string, string> = {}
  const shim = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v) },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: shim, writable: true, configurable: true,
  })
}

beforeEach(() => {
  installLocalStorageShim()
  let uuidCounter = 0
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
    uuidCounter += 1
    return `test-uuid-${uuidCounter}` as `${string}-${string}-${string}-${string}-${string}`
  })
})

describe('useRecentTrips', () => {
  it('records a new recent and persists it', () => {
    const { result } = renderHook(() => useRecentTrips())

    act(() => {
      result.current.recordRecent('KSU', 'KAFD', [46.62, 24.71], [46.64, 24.76])
    })

    expect(result.current.recents).toHaveLength(1)
    expect(result.current.recents[0]).toMatchObject({ start: 'KSU', dest: 'KAFD' })
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as unknown[]
    expect(stored).toHaveLength(1)
  })

  it('caps the list at 5 and evicts the oldest (FIFO)', () => {
    const { result } = renderHook(() => useRecentTrips())

    act(() => {
      for (let i = 1; i <= 6; i += 1) {
        result.current.recordRecent(`Start${i}`, `End${i}`)
      }
    })

    expect(result.current.recents).toHaveLength(5)
    expect(result.current.recents[0].start).toBe('Start6')
    expect(result.current.recents[4].start).toBe('Start2')
  })

  it('moves a duplicate to the top instead of inserting twice', () => {
    const { result } = renderHook(() => useRecentTrips())

    act(() => {
      result.current.recordRecent('A', 'B')
      result.current.recordRecent('C', 'D')
      result.current.recordRecent('A', 'B')
    })

    expect(result.current.recents).toHaveLength(2)
    expect(result.current.recents[0]).toMatchObject({ start: 'A', dest: 'B' })
    expect(result.current.recents[1]).toMatchObject({ start: 'C', dest: 'D' })
  })

  it('ignores empty inputs', () => {
    const { result } = renderHook(() => useRecentTrips())

    act(() => {
      result.current.recordRecent('', 'dest')
      result.current.recordRecent('start', '')
    })

    expect(result.current.recents).toHaveLength(0)
  })

  it('clearRecents empties the list and persists the empty state', () => {
    const { result } = renderHook(() => useRecentTrips())

    act(() => {
      result.current.recordRecent('A', 'B')
      result.current.recordRecent('C', 'D')
    })
    expect(result.current.recents).toHaveLength(2)

    act(() => { result.current.clearRecents() })

    expect(result.current.recents).toHaveLength(0)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([])
  })

  it('restores from localStorage on mount', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: 'x', start: 'Persisted-A', dest: 'Persisted-B' },
    ]))

    const { result } = renderHook(() => useRecentTrips())

    expect(result.current.recents).toHaveLength(1)
    expect(result.current.recents[0].start).toBe('Persisted-A')
  })
})
