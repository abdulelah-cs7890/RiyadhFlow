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
  'riyadh-speed-cameras.json',
)

interface OsmTags {
  highway?: string
  enforcement?: string
  maxspeed?: string
  [k: string]: string | undefined
}

interface OsmElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  tags?: OsmTags
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
          'User-Agent': 'riyadhflow-speed-cameras-import/1.0',
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

interface CameraOut {
  id: string
  lng: number
  lat: number
  maxspeed?: number
}

function parseMaxspeed(raw?: string): number | undefined {
  if (!raw) return undefined
  const m = raw.match(/(\d+)/)
  if (!m) return undefined
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : undefined
}

async function main() {
  console.log('→ fetching Riyadh speed cameras from OSM…')
  const query = `
[out:json][timeout:60];
(
  node["highway"="speed_camera"](24.4,46.3,25.0,47.1);
  node["enforcement"="maxspeed"](24.4,46.3,25.0,47.1);
  node["highway"="enforcement"]["enforcement"="maxspeed"](24.4,46.3,25.0,47.1);
);
out body;
`.trim()

  const data = await fetchOverpass(query)
  console.log(`  got ${data.elements.length} elements`)

  const seen = new Set<string>()
  const cameras: CameraOut[] = []
  for (const el of data.elements) {
    if (el.type !== 'node' || el.lat === undefined || el.lon === undefined) continue
    const key = `${el.lon.toFixed(5)},${el.lat.toFixed(5)}`
    if (seen.has(key)) continue
    seen.add(key)
    const out: CameraOut = {
      id: String(el.id),
      lng: el.lon,
      lat: el.lat,
    }
    const mx = parseMaxspeed(el.tags?.maxspeed)
    if (mx !== undefined) out.maxspeed = mx
    cameras.push(out)
  }

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true })
  await fs.writeFile(OUT_PATH, JSON.stringify(cameras, null, 2))
  console.log(`✓ wrote ${OUT_PATH}`)
  console.log(`  ${cameras.length} cameras`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
