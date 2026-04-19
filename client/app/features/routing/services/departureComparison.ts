const SLOTS = 9
const STEP_MINUTES = 30

export interface DepartureOption {
  departAt: Date
  etaMinutes: number
}

interface MapboxDirectionsResponse {
  routes?: Array<{ duration?: number }>
}

function nextQuarterHour(now: Date): Date {
  const d = new Date(now)
  const mins = d.getMinutes()
  const add = (15 - (mins % 15)) % 15 || 15
  d.setMinutes(mins + add, 0, 0)
  return d
}

// Mapbox depart_at rejects milliseconds — accepts YYYY-MM-DDThh:mm:ssZ only.
function toMapboxDepartAt(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export async function compareDepartureTimes(
  start: [number, number],
  end: [number, number],
  signal?: AbortSignal,
): Promise<DepartureOption[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) throw new Error('missing mapbox token')

  const base = nextQuarterHour(new Date())
  const slots = Array.from({ length: SLOTS }, (_, i) => {
    const d = new Date(base)
    d.setMinutes(d.getMinutes() + i * STEP_MINUTES)
    return d
  })

  const urls = slots.map(
    (s) =>
      `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
      `${start[0]},${start[1]};${end[0]},${end[1]}` +
      `?overview=false&depart_at=${encodeURIComponent(toMapboxDepartAt(s))}&access_token=${token}`,
  )

  const results = await Promise.allSettled(
    urls.map(async (u) => {
      const res = await fetch(u, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as MapboxDirectionsResponse
    }),
  )

  const opts: DepartureOption[] = []
  results.forEach((res, i) => {
    if (res.status !== 'fulfilled') return
    const d = res.value.routes?.[0]?.duration
    if (typeof d === 'number') {
      opts.push({ departAt: slots[i], etaMinutes: Math.round(d / 60) })
    }
  })

  if (opts.length === 0) throw new Error('no route data')
  opts.sort((a, b) => a.etaMinutes - b.etaMinutes)
  return opts
}
