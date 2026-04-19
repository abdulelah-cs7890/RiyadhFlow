'use client'

import { useCallback, useRef, useState } from 'react'
import { compareDepartureTimes, DepartureOption } from '../services/departureComparison'

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface State {
  status: Status
  options: DepartureOption[]
  cacheKey: string | null
}

interface UseDepartureComparisonResult {
  status: Status
  options: DepartureOption[]
  compare: (start: [number, number], end: [number, number]) => Promise<void>
  reset: () => void
}

function keyFor(start: [number, number], end: [number, number]): string {
  return `${start[0]},${start[1]}|${end[0]},${end[1]}`
}

export function useDepartureComparison(): UseDepartureComparisonResult {
  const [state, setState] = useState<State>({ status: 'idle', options: [], cacheKey: null })
  const abortRef = useRef<AbortController | null>(null)

  const compare = useCallback(
    async (start: [number, number], end: [number, number]) => {
      const key = keyFor(start, end)
      if (state.cacheKey === key && state.status === 'ready') return

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setState({ status: 'loading', options: [], cacheKey: key })
      try {
        const options = await compareDepartureTimes(start, end, controller.signal)
        if (controller.signal.aborted) return
        setState({ status: 'ready', options, cacheKey: key })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setState({ status: 'error', options: [], cacheKey: key })
      }
    },
    [state.cacheKey, state.status],
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState({ status: 'idle', options: [], cacheKey: null })
  }, [])

  return { status: state.status, options: state.options, compare, reset }
}
