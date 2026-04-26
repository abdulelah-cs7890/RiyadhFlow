import { promises as fs } from 'fs'
import path from 'path'

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const OUT_PATH = path.resolve(
  __dirname,
  '..',
  'app',
  'features',
  'routing',
  'data',
  'riyadh-metro.json',
)

const LINE_COLOR_FALLBACKS: Record<string, string> = {
  '1': '#0057A3',
  '2': '#E31837',
  '3': '#F68B1F',
  '4': '#FFD100',
  '5': '#00A651',
  '6': '#6E2A84',
}

const LINE_NAME_EN_FALLBACKS: Record<string, string> = {
  '1': 'Blue Line (Line 1)',
  '2': 'Red Line (Line 2)',
  '3': 'Orange Line (Line 3)',
  '4': 'Yellow Line (Line 4)',
  '5': 'Green Line (Line 5)',
  '6': 'Purple Line (Line 6)',
}

const LINE_NAME_AR_FALLBACKS: Record<string, string> = {
  '1': 'الخط الأزرق',
  '2': 'الخط الأحمر',
  '3': 'الخط البرتقالي',
  '4': 'الخط الأصفر',
  '5': 'الخط الأخضر',
  '6': 'الخط البنفسجي',
}

const LINE_ID_FROM_REF: Record<string, string> = {
  '1': 'blue',
  '2': 'red',
  '3': 'orange',
  '4': 'yellow',
  '5': 'green',
  '6': 'purple',
}

interface OsmTags {
  name?: string
  'name:en'?: string
  'name:ar'?: string
  ref?: string
  colour?: string
  color?: string
  network?: string
  operator?: string
  route?: string
  railway?: string
  station?: string
  public_transport?: string
  subway?: string
  [k: string]: string | undefined
}

interface OsmMember {
  type: 'node' | 'way' | 'relation'
  ref: number
  role?: string
}

interface OsmElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  tags?: OsmTags
  members?: OsmMember[]
  nodes?: number[]
  geometry?: Array<{ lat: number; lon: number }>
}

interface OverpassResponse {
  elements: OsmElement[]
}

async function fetchOverpass(query: string): Promise<OverpassResponse> {
  let lastError: unknown
  for (const url of OVERPASS_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'riyadhflow-metro-import/1.0',
          Accept: 'application/json',
        },
        body: new URLSearchParams({ data: query }).toString(),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status} from ${url}${body ? `: ${body.slice(0, 200)}` : ''}`)
      }
      return (await res.json()) as OverpassResponse
    } catch (err) {
      lastError = err
      console.warn(`  endpoint failed: ${url} — ${(err as Error).message}`)
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
  throw lastError ?? new Error('all overpass endpoints failed')
}

interface StationOut {
  id: string
  nameEn: string
  nameAr: string
  lng: number
  lat: number
  lineIds: string[]
}

interface LineOut {
  id: string
  nameEn: string
  nameAr: string
  color: string
  stationIds: string[]
  geometry: { type: 'LineString'; coordinates: [number, number][] }
}

interface NetworkOut {
  lines: LineOut[]
  stations: StationOut[]
}

function transliterateFallback(name: string): string {
  return name
}

function pickLineId(rel: OsmElement): string | null {
  const ref = rel.tags?.ref?.trim()
  if (ref && LINE_ID_FROM_REF[ref]) return LINE_ID_FROM_REF[ref]
  const nameEn = (rel.tags?.['name:en'] ?? rel.tags?.name ?? '').toLowerCase()
  for (const [refKey, color] of Object.entries(LINE_NAME_EN_FALLBACKS)) {
    if (nameEn.includes(color.split(' ')[0].toLowerCase())) return LINE_ID_FROM_REF[refKey]
  }
  return null
}

function pickColor(rel: OsmElement, lineId: string): string {
  const raw = rel.tags?.colour ?? rel.tags?.color
  if (raw) {
    const hex = raw.trim()
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex.toUpperCase()
  }
  const ref = Object.entries(LINE_ID_FROM_REF).find(([, v]) => v === lineId)?.[0]
  return ref ? LINE_COLOR_FALLBACKS[ref] : '#666666'
}

function pickLineName(
  rel: OsmElement,
  lineId: string,
): { en: string; ar: string } {
  const ref = Object.entries(LINE_ID_FROM_REF).find(([, v]) => v === lineId)?.[0]
  const en =
    rel.tags?.['name:en'] ??
    rel.tags?.name ??
    (ref ? LINE_NAME_EN_FALLBACKS[ref] : `Line ${lineId}`)
  const ar =
    rel.tags?.['name:ar'] ??
    (ref ? LINE_NAME_AR_FALLBACKS[ref] : en)
  return { en: transliterateFallback(en), ar }
}

function dedupeCoords(coords: [number, number][]): [number, number][] {
  const out: [number, number][] = []
  for (const c of coords) {
    const last = out[out.length - 1]
    if (!last || last[0] !== c[0] || last[1] !== c[1]) out.push(c)
  }
  return out
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

const MERGE_RADIUS_METERS = 500

async function main() {
  console.log('→ fetching Riyadh Metro route relations…')
  const query = `
[out:json][timeout:60];
(
  relation["route"="subway"]["network"~"Riyadh Metro",i];
  relation["route"="subway"]["operator"~"Riyadh Metro",i];
);
out body;
>;
out skel geom;
`.trim()

  const data = await fetchOverpass(query)
  console.log(`  got ${data.elements.length} elements`)

  console.log('→ fetching named Riyadh Metro station nodes…')
  const stationQuery = `
[out:json][timeout:60];
(
  node["railway"="station"]["station"="subway"](24.4,46.3,25.0,47.1);
  node["public_transport"="station"]["subway"="yes"](24.4,46.3,25.0,47.1);
  node["railway"="station"]["network"~"Riyadh Metro",i](24.4,46.3,25.0,47.1);
);
out body;
`.trim()
  const stationsRaw = await fetchOverpass(stationQuery)
  const namedStations: Array<{
    id: number
    lng: number
    lat: number
    nameEn: string
    nameAr: string
  }> = []
  for (const el of stationsRaw.elements) {
    if (el.type !== 'node' || el.lat === undefined || el.lon === undefined) continue
    const tags = el.tags ?? {}
    const nameEn = tags['name:en'] ?? tags.name
    const nameAr = tags['name:ar'] ?? tags.name
    if (!nameEn) continue
    namedStations.push({
      id: el.id,
      lng: el.lon,
      lat: el.lat,
      nameEn,
      nameAr: nameAr ?? nameEn,
    })
  }
  console.log(`  got ${namedStations.length} named stations`)

  // Canonical station lookup: given a stop_position lng/lat, return the nearest
  // named station within MERGE_RADIUS_METERS. Stations merge to the same
  // canonical id, which is how interchanges get detected.
  function canonicalize(
    lng: number,
    lat: number,
  ): { id: string; nameEn: string; nameAr: string; lng: number; lat: number } | null {
    let best: (typeof namedStations)[number] | null = null
    let bestDist = Infinity
    for (const s of namedStations) {
      const d = haversineMeters([lng, lat], [s.lng, s.lat])
      if (d < bestDist) {
        bestDist = d
        best = s
      }
    }
    if (!best || bestDist > MERGE_RADIUS_METERS) return null
    return {
      id: String(best.id),
      nameEn: best.nameEn,
      nameAr: best.nameAr,
      lng: best.lng,
      lat: best.lat,
    }
  }

  const nodeById = new Map<number, OsmElement>()
  const wayById = new Map<number, OsmElement>()
  const relations: OsmElement[] = []
  for (const el of data.elements) {
    if (el.type === 'node') nodeById.set(el.id, el)
    else if (el.type === 'way') wayById.set(el.id, el)
    else if (el.type === 'relation') relations.push(el)
  }

  const stationMap = new Map<string, StationOut>()
  const lines: LineOut[] = []

  for (const rel of relations) {
    const lineId = pickLineId(rel)
    if (!lineId) {
      console.warn(`  skipping relation ${rel.id} — no recognizable ref`)
      continue
    }
    if (lines.find((l) => l.id === lineId)) {
      // Some networks have two relations per line (one per direction); take the first.
      continue
    }

    const color = pickColor(rel, lineId)
    const { en, ar } = pickLineName(rel, lineId)

    const stationIds: string[] = []
    const coords: [number, number][] = []

    for (const m of rel.members ?? []) {
      if (m.type === 'node') {
        const node = nodeById.get(m.ref)
        if (!node || node.lat === undefined || node.lon === undefined) continue
        const tags = node.tags ?? {}
        const looksLikeStop =
          m.role === 'stop' ||
          m.role === 'stop_entry_only' ||
          m.role === 'stop_exit_only' ||
          m.role === 'station' ||
          tags.public_transport === 'stop_position' ||
          tags.public_transport === 'station' ||
          tags.railway === 'station' ||
          tags.station === 'subway'
        if (!looksLikeStop) continue

        const canon = canonicalize(node.lon, node.lat)
        const sid = canon?.id ?? String(node.id)
        if (stationIds[stationIds.length - 1] === sid) continue
        if (!stationIds.includes(sid)) stationIds.push(sid)

        if (!stationMap.has(sid)) {
          stationMap.set(sid, {
            id: sid,
            nameEn: canon?.nameEn ?? tags['name:en'] ?? tags.name ?? `Station ${sid}`,
            nameAr: canon?.nameAr ?? tags['name:ar'] ?? tags.name ?? `محطة ${sid}`,
            lng: canon?.lng ?? node.lon,
            lat: canon?.lat ?? node.lat,
            lineIds: [lineId],
          })
        } else {
          const existing = stationMap.get(sid)!
          if (!existing.lineIds.includes(lineId)) existing.lineIds.push(lineId)
        }
      } else if (m.type === 'way') {
        const way = wayById.get(m.ref)
        if (!way?.geometry) continue
        for (const pt of way.geometry) {
          coords.push([pt.lon, pt.lat])
        }
      }
    }

    lines.push({
      id: lineId,
      nameEn: en,
      nameAr: ar,
      color,
      stationIds,
      geometry: { type: 'LineString', coordinates: dedupeCoords(coords) },
    })
  }

  // Validation
  const problems: string[] = []
  if (lines.length === 0) problems.push('no lines extracted')
  for (const line of lines) {
    if (line.stationIds.length < 5) {
      problems.push(`line ${line.id} has only ${line.stationIds.length} stations`)
    }
    if (line.geometry.coordinates.length < 2) {
      problems.push(`line ${line.id} has no geometry`)
    }
  }
  if (problems.length > 0) {
    console.warn('  validation warnings:')
    for (const p of problems) console.warn(`    - ${p}`)
  }

  const interchanges = [...stationMap.values()].filter((s) => s.lineIds.length > 1)

  const out: NetworkOut = {
    lines,
    stations: [...stationMap.values()],
  }

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true })
  await fs.writeFile(OUT_PATH, JSON.stringify(out, null, 2))
  console.log(`✓ wrote ${OUT_PATH}`)
  console.log(
    `  ${lines.length} lines, ${out.stations.length} stations, ${interchanges.length} interchanges`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
