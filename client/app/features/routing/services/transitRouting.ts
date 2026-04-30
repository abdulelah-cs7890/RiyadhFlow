export interface WalkLeg {
  kind: 'walk'
  from: [number, number]
  to: [number, number]
  minutes: number
  meters: number
  toStationName?: { en: string; ar: string }
  fromStationName?: { en: string; ar: string }
}

export interface TrainLeg {
  kind: 'train'
  lineId: string
  lineColor: string
  lineNameEn: string
  lineNameAr: string
  boardStationId: string
  boardStationName: { en: string; ar: string }
  alightStationId: string
  alightStationName: { en: string; ar: string }
  stopCount: number
  minutes: number
  geometry: { type: 'LineString'; coordinates: [number, number][] }
}

export type TransitLeg = WalkLeg | TrainLeg

export interface TransitPlan {
  kind: 'route'
  legs: TransitLeg[]
  totalMinutes: number
  walkMinutes: number
  trainMinutes: number
  transferCount: number
}

export interface TransitFailure {
  kind: 'no-route'
  nearestStationKm: number | null
}

const WALK_SPEED_KMH = 5
const WALK_DETOUR = 1.3
const PER_STOP_MIN = 2
const TRANSFER_MIN = 3
const MAX_WALK_KM = 1.0
const CANDIDATE_STATIONS = 3

interface Station {
  id: string
  nameEn: string
  nameAr: string
  lng: number
  lat: number
  lineIds: string[]
}

interface Line {
  id: string
  nameEn: string
  nameAr: string
  color: string
  stationIds: string[]
  geometry: { type: 'LineString'; coordinates: [number, number][] }
}

interface Network {
  lines: Line[]
  stations: Station[]
}

// Lazily fetched + cached on first metro routing call. Was previously a
// 144 KB JSON imported at module scope, which forced the whole network into
// the initial JS bundle. Now it streams from /data/riyadh-metro.json once
// per session (and is HTTP-cached by the browser thereafter).
let NET: Network = { lines: [], stations: [] }
const stationById = new Map<string, Station>()
const lineById = new Map<string, Line>()
const adjacency = new Map<string, Array<{ to: string; lineId: string }>>()
let networkLoaded: Promise<void> | null = null

async function loadNetwork(): Promise<void> {
  if (networkLoaded) return networkLoaded
  networkLoaded = (async () => {
    const res = await fetch('/data/riyadh-metro.json')
    if (!res.ok) {
      networkLoaded = null
      throw new Error(`Failed to load metro network: HTTP ${res.status}`)
    }
    NET = (await res.json()) as Network
    stationById.clear()
    lineById.clear()
    adjacency.clear()
    for (const s of NET.stations) stationById.set(s.id, s)
    for (const l of NET.lines) lineById.set(l.id, l)
    for (const line of NET.lines) {
      for (let i = 0; i < line.stationIds.length - 1; i++) {
        const a = line.stationIds[i]
        const b = line.stationIds[i + 1]
        if (!adjacency.has(a)) adjacency.set(a, [])
        if (!adjacency.has(b)) adjacency.set(b, [])
        adjacency.get(a)!.push({ to: b, lineId: line.id })
        adjacency.get(b)!.push({ to: a, lineId: line.id })
      }
    }
  })()
  return networkLoaded
}

function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

function walkMinutes(from: [number, number], to: [number, number]): number {
  const meters = haversineMeters(from, to) * WALK_DETOUR
  return meters / 1000 / WALK_SPEED_KMH * 60
}

function walkMeters(from: [number, number], to: [number, number]): number {
  return haversineMeters(from, to) * WALK_DETOUR
}

function kNearestStations(point: [number, number], k: number): Array<{ station: Station; meters: number }> {
  const ranked = NET.stations.map((s) => ({
    station: s,
    meters: haversineMeters(point, [s.lng, s.lat]) * WALK_DETOUR,
  }))
  ranked.sort((a, b) => a.meters - b.meters)
  return ranked.slice(0, k)
}

// State key: `${stationId}|${arrivingLineId | ''}`. The arrivingLineId lets
// us charge a TRANSFER_MIN cost only when the train line changes.
function encode(stationId: string, line: string | null): string {
  return `${stationId}|${line ?? ''}`
}

function decode(key: string): { stationId: string; line: string | null } {
  const [stationId, line] = key.split('|')
  return { stationId, line: line || null }
}

interface DijkstraResult {
  path: Array<{ stationId: string; line: string | null }>
  totalMinutes: number
}

function dijkstra(
  start: [number, number],
  end: [number, number],
  startCandidates: Array<{ station: Station; meters: number }>,
  endCandidates: Array<{ station: Station; meters: number }>,
): DijkstraResult | null {
  const START = '__start__'
  const END = '__end__'

  const dist = new Map<string, number>()
  const prev = new Map<string, string | null>()
  const pq: Array<{ key: string; cost: number }> = []

  // Seed: START → (candidate station, entering via each line)
  dist.set(START, 0)
  prev.set(START, null)

  for (const { station, meters } of startCandidates) {
    const walkMin = (meters / 1000) / WALK_SPEED_KMH * 60
    for (const lineId of station.lineIds) {
      const key = encode(station.id, lineId)
      const cost = walkMin
      if (!dist.has(key) || dist.get(key)! > cost) {
        dist.set(key, cost)
        prev.set(key, START)
        pq.push({ key, cost })
      }
    }
  }

  const endCandidateIds = new Set(endCandidates.map((c) => c.station.id))
  const endWalkByStation = new Map<string, number>()
  for (const { station, meters } of endCandidates) {
    endWalkByStation.set(station.id, (meters / 1000) / WALK_SPEED_KMH * 60)
  }

  let bestEndCost = Infinity
  let bestEndPredecessor: string | null = null

  // Naive PQ — fine for < 1000 states.
  while (pq.length) {
    pq.sort((a, b) => a.cost - b.cost)
    const { key, cost } = pq.shift()!
    if (cost > (dist.get(key) ?? Infinity)) continue

    const { stationId, line } = decode(key)

    // Option: alight to destination
    if (endCandidateIds.has(stationId)) {
      const alightCost = cost + endWalkByStation.get(stationId)!
      if (alightCost < bestEndCost) {
        bestEndCost = alightCost
        bestEndPredecessor = key
      }
    }

    // Option: continue along same line to adjacent station
    const neighbors = adjacency.get(stationId) ?? []
    for (const { to, lineId } of neighbors) {
      if (lineId !== line) continue // must board/transfer before switching lines
      const nKey = encode(to, lineId)
      const nCost = cost + PER_STOP_MIN
      if (nCost < (dist.get(nKey) ?? Infinity)) {
        dist.set(nKey, nCost)
        prev.set(nKey, key)
        pq.push({ key: nKey, cost: nCost })
      }
    }

    // Option: transfer to another line at same station (costs TRANSFER_MIN)
    const station = stationById.get(stationId)
    if (station && station.lineIds.length > 1) {
      for (const otherLine of station.lineIds) {
        if (otherLine === line) continue
        const nKey = encode(stationId, otherLine)
        const nCost = cost + TRANSFER_MIN
        if (nCost < (dist.get(nKey) ?? Infinity)) {
          dist.set(nKey, nCost)
          prev.set(nKey, key)
          pq.push({ key: nKey, cost: nCost })
        }
      }
    }
  }

  if (bestEndPredecessor === null) return null

  dist.set(END, bestEndCost)
  prev.set(END, bestEndPredecessor)

  // Reconstruct path from END back to START
  const path: Array<{ stationId: string; line: string | null }> = []
  let cursor: string | null = bestEndPredecessor
  while (cursor && cursor !== START) {
    const { stationId, line } = decode(cursor)
    path.unshift({ stationId, line })
    cursor = prev.get(cursor) ?? null
  }

  return { path, totalMinutes: bestEndCost }
}

function sliceLineGeometry(
  line: Line,
  boardId: string,
  alightId: string,
): { type: 'LineString'; coordinates: [number, number][] } {
  const stops = line.stationIds
  const boardIdx = stops.indexOf(boardId)
  const alightIdx = stops.indexOf(alightId)
  if (boardIdx < 0 || alightIdx < 0) {
    return { type: 'LineString', coordinates: [] }
  }
  const board = stationById.get(boardId)
  const alight = stationById.get(alightId)
  if (!board || !alight) return { type: 'LineString', coordinates: [] }

  const coords = line.geometry.coordinates
  if (coords.length < 2) {
    return {
      type: 'LineString',
      coordinates: [
        [board.lng, board.lat],
        [alight.lng, alight.lat],
      ],
    }
  }

  // Project each station to nearest vertex on the line geometry.
  function nearestVertexIdx(p: [number, number]): number {
    let bestIdx = 0
    let bestD = Infinity
    for (let i = 0; i < coords.length; i++) {
      const d = haversineMeters(p, coords[i])
      if (d < bestD) {
        bestD = d
        bestIdx = i
      }
    }
    return bestIdx
  }

  const iA = nearestVertexIdx([board.lng, board.lat])
  const iB = nearestVertexIdx([alight.lng, alight.lat])
  const lo = Math.min(iA, iB)
  const hi = Math.max(iA, iB)
  const slice = coords.slice(lo, hi + 1)
  // Ensure orientation matches travel direction
  if (iA > iB) slice.reverse()
  // Prepend/append exact station coords so the segment visibly starts/ends at platforms
  const first: [number, number] = [board.lng, board.lat]
  const last: [number, number] = [alight.lng, alight.lat]
  if (slice.length === 0) return { type: 'LineString', coordinates: [first, last] }
  return { type: 'LineString', coordinates: [first, ...slice, last] }
}

export async function planTransitTrip(
  start: [number, number],
  end: [number, number],
): Promise<TransitPlan | TransitFailure> {
  await loadNetwork()
  const startCandidates = kNearestStations(start, CANDIDATE_STATIONS).filter(
    (c) => c.meters / 1000 <= MAX_WALK_KM,
  )
  const endCandidates = kNearestStations(end, CANDIDATE_STATIONS).filter(
    (c) => c.meters / 1000 <= MAX_WALK_KM,
  )

  if (startCandidates.length === 0 || endCandidates.length === 0) {
    // Report the distance of the endpoint that has no viable station (the
    // "why you can't take the metro" reason). If both are out of range, pick
    // the larger gap.
    const startNearest = kNearestStations(start, 1)[0]?.meters ?? Infinity
    const endNearest = kNearestStations(end, 1)[0]?.meters ?? Infinity
    const startFar = startCandidates.length === 0 ? startNearest : 0
    const endFar = endCandidates.length === 0 ? endNearest : 0
    const worst = Math.max(startFar, endFar)
    return {
      kind: 'no-route',
      nearestStationKm: Number.isFinite(worst) ? worst / 1000 : null,
    }
  }

  const result = dijkstra(start, end, startCandidates, endCandidates)
  if (!result) return { kind: 'no-route', nearestStationKm: null }

  // Reconstruct legs: walk in → [train segments (collapse consecutive same-line)] → walk out
  const legs: TransitLeg[] = []
  const firstStation = stationById.get(result.path[0].stationId)!
  const lastPathNode = result.path[result.path.length - 1]
  const lastStation = stationById.get(lastPathNode.stationId)!

  legs.push({
    kind: 'walk',
    from: start,
    to: [firstStation.lng, firstStation.lat],
    minutes: walkMinutes(start, [firstStation.lng, firstStation.lat]),
    meters: walkMeters(start, [firstStation.lng, firstStation.lat]),
    toStationName: { en: firstStation.nameEn, ar: firstStation.nameAr },
  })

  // Collapse consecutive same-line hops into TrainLeg
  let segStart = 0
  let transferCount = 0
  while (segStart < result.path.length) {
    const currentLine = result.path[segStart].line
    if (currentLine === null) {
      segStart++
      continue
    }
    let segEnd = segStart
    while (
      segEnd + 1 < result.path.length &&
      result.path[segEnd + 1].line === currentLine
    ) {
      segEnd++
    }
    const boardStation = stationById.get(result.path[segStart].stationId)!
    const alightStation = stationById.get(result.path[segEnd].stationId)!
    const line = lineById.get(currentLine)!
    const stopCount = segEnd - segStart
    legs.push({
      kind: 'train',
      lineId: line.id,
      lineColor: line.color,
      lineNameEn: line.nameEn,
      lineNameAr: line.nameAr,
      boardStationId: boardStation.id,
      boardStationName: { en: boardStation.nameEn, ar: boardStation.nameAr },
      alightStationId: alightStation.id,
      alightStationName: { en: alightStation.nameEn, ar: alightStation.nameAr },
      stopCount,
      minutes: stopCount * PER_STOP_MIN,
      geometry: sliceLineGeometry(line, boardStation.id, alightStation.id),
    })
    if (segEnd + 1 < result.path.length) transferCount++
    segStart = segEnd + 1
  }

  legs.push({
    kind: 'walk',
    from: [lastStation.lng, lastStation.lat],
    to: end,
    minutes: walkMinutes([lastStation.lng, lastStation.lat], end),
    meters: walkMeters([lastStation.lng, lastStation.lat], end),
    fromStationName: { en: lastStation.nameEn, ar: lastStation.nameAr },
  })

  const walkMins = legs
    .filter((l): l is WalkLeg => l.kind === 'walk')
    .reduce((s, l) => s + l.minutes, 0)
  const trainMins = legs
    .filter((l): l is TrainLeg => l.kind === 'train')
    .reduce((s, l) => s + l.minutes, 0)

  return {
    kind: 'route',
    legs,
    totalMinutes: walkMins + trainMins + transferCount * TRANSFER_MIN,
    walkMinutes: walkMins,
    trainMinutes: trainMins,
    transferCount,
  }
}

// Exposed for tests and the comparison-nudge feature.
export function __getMetroNetwork(): Network {
  return NET
}
