import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BBOX = { south: 24.5, west: 46.4, north: 24.95, east: 47.0 }
const PER_CATEGORY_CAP = 300
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

type CategoryEnum =
  | 'RESTAURANTS' | 'HOTELS' | 'THINGS_TO_DO' | 'MUSEUMS'
  | 'TRANSIT' | 'PHARMACIES' | 'GYMS'

interface OsmTags {
  name?: string
  'name:ar'?: string
  'name:en'?: string
  'addr:street'?: string
  'addr:suburb'?: string
  'addr:neighbourhood'?: string
  'addr:district'?: string
  'addr:city_district'?: string
  amenity?: string
  tourism?: string
  leisure?: string
  railway?: string
  public_transport?: string
  cuisine?: string
  image?: string
  wikimedia_commons?: string
  wikidata?: string
  [k: string]: string | undefined
}

interface OsmElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: OsmTags
}

interface CategorySpec {
  category: CategoryEnum
  filters: string[] // individual OSM filter fragments like 'amenity=restaurant'
  defaultType: { en: string; ar: string }
  typeMap?: Record<string, { en: string; ar: string }>
}

const CATEGORIES: CategorySpec[] = [
  {
    category: 'RESTAURANTS',
    filters: ['amenity=restaurant', 'amenity=cafe', 'amenity=fast_food'],
    defaultType: { en: 'Restaurant', ar: 'مطعم' },
    typeMap: {
      cafe: { en: 'Cafe', ar: 'مقهى' },
      fast_food: { en: 'Fast Food', ar: 'وجبات سريعة' },
      restaurant: { en: 'Restaurant', ar: 'مطعم' },
    },
  },
  {
    category: 'HOTELS',
    filters: ['tourism=hotel', 'tourism=hostel', 'tourism=apartment'],
    defaultType: { en: 'Hotel', ar: 'فندق' },
    typeMap: {
      hotel: { en: 'Hotel', ar: 'فندق' },
      hostel: { en: 'Hostel', ar: 'نزل' },
      apartment: { en: 'Serviced Apartment', ar: 'شقق مفروشة' },
    },
  },
  {
    category: 'THINGS_TO_DO',
    filters: ['tourism=attraction', 'leisure=park', 'tourism=theme_park'],
    defaultType: { en: 'Attraction', ar: 'معلم سياحي' },
    typeMap: {
      attraction: { en: 'Attraction', ar: 'معلم سياحي' },
      park: { en: 'Park', ar: 'حديقة' },
      theme_park: { en: 'Theme Park', ar: 'مدينة ملاهي' },
    },
  },
  {
    category: 'MUSEUMS',
    filters: ['tourism=museum', 'tourism=gallery'],
    defaultType: { en: 'Museum', ar: 'متحف' },
    typeMap: {
      museum: { en: 'Museum', ar: 'متحف' },
      gallery: { en: 'Gallery', ar: 'معرض فني' },
    },
  },
  {
    category: 'TRANSIT',
    filters: [
      'amenity=bus_station',
      'railway=station',
      'public_transport=station',
      'railway=subway_entrance',
    ],
    defaultType: { en: 'Transit Station', ar: 'محطة مواصلات' },
    typeMap: {
      bus_station: { en: 'Bus Station', ar: 'محطة حافلات' },
      station: { en: 'Train Station', ar: 'محطة قطار' },
      subway_entrance: { en: 'Metro Entrance', ar: 'مدخل مترو' },
    },
  },
  {
    category: 'PHARMACIES',
    filters: ['amenity=pharmacy'],
    defaultType: { en: 'Pharmacy', ar: 'صيدلية' },
  },
  {
    category: 'GYMS',
    filters: ['leisure=fitness_centre', 'leisure=sports_centre'],
    defaultType: { en: 'Gym', ar: 'نادي رياضي' },
    typeMap: {
      fitness_centre: { en: 'Gym', ar: 'نادي رياضي' },
      sports_centre: { en: 'Sports Centre', ar: 'مركز رياضي' },
    },
  },
]

function buildQuery(filters: string[]): string {
  const { south, west, north, east } = BBOX
  const clauses = filters
    .map((f) => {
      const [k, v] = f.split('=')
      return `  node["${k}"="${v}"]["name"](${south},${west},${north},${east});`
    })
    .join('\n')
  return `[out:json][timeout:90];\n(\n${clauses}\n);\nout body;`
}

async function fetchCategory(spec: CategorySpec): Promise<OsmElement[]> {
  const query = buildQuery(spec.filters)
  const maxAttempts = 6
  let lastStatus = 0
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const url = OVERPASS_URLS[(attempt - 1) % OVERPASS_URLS.length]
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'RiyadhFlow-POI-Import/1.0 (portfolio project)',
          'Accept': 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
      })
      if (res.ok) {
        const data = (await res.json()) as { elements: OsmElement[] }
        return data.elements ?? []
      }
      lastStatus = res.status
      if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
        const backoffSec = 15 * attempt
        const host = new URL(url).host
        process.stdout.write(`HTTP ${res.status} from ${host}, retrying in ${backoffSec}s… `)
        await new Promise((r) => setTimeout(r, backoffSec * 1000))
        continue
      }
      throw new Error(`Overpass ${spec.category}: HTTP ${res.status}`)
    } catch (err) {
      if (attempt < maxAttempts) {
        const backoffSec = 15 * attempt
        process.stdout.write(`network error, retrying in ${backoffSec}s… `)
        await new Promise((r) => setTimeout(r, backoffSec * 1000))
        continue
      }
      throw err
    }
  }
  throw new Error(`Overpass ${spec.category}: retries exhausted (last status ${lastStatus})`)
}

function pickType(
  tags: OsmTags,
  spec: CategorySpec,
): { type: string; type_ar: string } {
  if (!spec.typeMap) return { type: spec.defaultType.en, type_ar: spec.defaultType.ar }
  const tagValue = tags.amenity ?? tags.tourism ?? tags.leisure ?? tags.railway ?? tags.public_transport
  const mapped = tagValue ? spec.typeMap[tagValue] : undefined
  if (mapped) return { type: mapped.en, type_ar: mapped.ar }
  return { type: spec.defaultType.en, type_ar: spec.defaultType.ar }
}

function commonsFilenameToUrl(filename: string): string {
  const clean = filename.replace(/^File:/i, '').trim()
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(clean)}?width=800`
}

interface WikidataEntity {
  claims?: {
    P18?: Array<{ mainsnak?: { datavalue?: { value?: string } } }>
  }
}

interface WikidataResponse {
  entities?: Record<string, WikidataEntity>
}

async function fetchWikidataImages(qids: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {}
  const batchSize = 50
  for (let i = 0; i < qids.length; i += batchSize) {
    const batch = qids.slice(i, i + batchSize)
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${batch.join('|')}&props=claims&format=json&origin=*`
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'RiyadhFlow-POI-Import/1.0 (portfolio project)',
          'Accept': 'application/json',
        },
      })
      if (!res.ok) {
        for (const qid of batch) result[qid] = null
        continue
      }
      const data = (await res.json()) as WikidataResponse
      for (const qid of batch) {
        const filename = data.entities?.[qid]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value
        result[qid] = filename ? commonsFilenameToUrl(filename) : null
      }
    } catch {
      for (const qid of batch) result[qid] = null
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return result
}

async function resolveImageUrls(rows: Array<{ image_url: string | null; _tags: OsmTags }>): Promise<void> {
  const qidsNeeded = new Set<string>()
  for (const r of rows) {
    const tags = r._tags
    if (tags.image && /^https?:\/\//i.test(tags.image)) {
      r.image_url = tags.image
      continue
    }
    if (tags.wikimedia_commons) {
      r.image_url = commonsFilenameToUrl(tags.wikimedia_commons)
      continue
    }
    if (tags.wikidata && /^Q\d+$/.test(tags.wikidata)) {
      qidsNeeded.add(tags.wikidata)
    }
  }
  if (qidsNeeded.size === 0) return
  const qids = Array.from(qidsNeeded)
  console.log(`  resolving ${qids.length} Wikidata image(s)…`)
  const map = await fetchWikidataImages(qids)
  for (const r of rows) {
    if (r.image_url) continue
    const qid = r._tags.wikidata
    if (qid && map[qid]) r.image_url = map[qid]
  }
}

function pickAddress(tags: OsmTags): { address: string; address_ar: string } {
  const area =
    tags['addr:suburb'] ??
    tags['addr:neighbourhood'] ??
    tags['addr:district'] ??
    tags['addr:city_district'] ??
    null
  const street = tags['addr:street']
  if (area && street) {
    return {
      address: `${street}, ${area}, Riyadh`,
      address_ar: `${street}، ${area}، الرياض`,
    }
  }
  if (area) {
    return { address: `${area}, Riyadh`, address_ar: `${area}، الرياض` }
  }
  if (street) {
    return { address: `${street}, Riyadh`, address_ar: `${street}، الرياض` }
  }
  return { address: 'Riyadh', address_ar: 'الرياض' }
}

interface NominatimAddress {
  suburb?: string
  neighbourhood?: string
  city_district?: string
  quarter?: string
  residential?: string
}

async function reverseGeocodeNeighborhood(
  lng: number,
  lat: number,
  lang: 'en' | 'ar',
): Promise<string | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse` +
    `?lat=${lat}&lon=${lng}&format=jsonv2&zoom=16&addressdetails=1&accept-language=${lang}`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'RiyadhFlow-POI-Import/1.0 (portfolio project; contact: abdulallah7981@gmail.com)',
        Accept: 'application/json',
      },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { address?: NominatimAddress }
    const a = data.address ?? {}
    return (
      a.suburb ??
      a.neighbourhood ??
      a.city_district ??
      a.quarter ??
      a.residential ??
      null
    )
  } catch {
    return null
  }
}

async function resolveMissingAddresses(
  rows: Array<{ address: string; address_ar: string; lng: number; lat: number }>,
): Promise<void> {
  const needsFill = rows.filter(
    (r) => r.address === 'Riyadh' && r.address_ar === 'الرياض',
  )
  if (needsFill.length === 0) return
  console.log(`  reverse-geocoding ${needsFill.length} row(s) via Nominatim (serialized, ~1 rps)…`)
  let done = 0
  let filled = 0
  for (const r of needsFill) {
    const en = await reverseGeocodeNeighborhood(r.lng, r.lat, 'en')
    await new Promise((res) => setTimeout(res, 1100))
    const ar = await reverseGeocodeNeighborhood(r.lng, r.lat, 'ar')
    await new Promise((res) => setTimeout(res, 1100))
    if (en) r.address = `${en}, Riyadh`
    if (ar) r.address_ar = `${ar}، الرياض`
    if (en || ar) filled++
    done++
    if (done % 25 === 0) {
      process.stdout.write(`    ${done}/${needsFill.length} (${filled} filled)…\n`)
    }
  }
  console.log(`  ${filled}/${needsFill.length} rows got a neighborhood`)
}

async function main() {
  console.log(`Importing Riyadh POIs from OpenStreetMap (bbox ${BBOX.south},${BBOX.west} → ${BBOX.north},${BBOX.east})`)

  const rows: Array<{
    name: string
    name_ar: string | null
    type: string
    type_ar: string
    category: CategoryEnum
    address: string
    address_ar: string
    lng: number
    lat: number
    image_url: string | null
    _tags: OsmTags
  }> = []

  for (const spec of CATEGORIES) {
    process.stdout.write(`  ${spec.category}: fetching… `)
    const elements = await fetchCategory(spec)
    const filtered = elements
      .filter((e) => e.tags?.name)
      .filter((e) => {
        const lat = e.lat ?? e.center?.lat
        const lon = e.lon ?? e.center?.lon
        return typeof lat === 'number' && typeof lon === 'number'
      })
      .slice(0, PER_CATEGORY_CAP)

    for (const e of filtered) {
      const tags = e.tags!
      const lat = (e.lat ?? e.center!.lat) as number
      const lon = (e.lon ?? e.center!.lon) as number
      const name = tags['name:en'] ?? tags.name!
      const name_ar = tags['name:ar'] ?? null
      const { type, type_ar } = pickType(tags, spec)
      const { address, address_ar } = pickAddress(tags)
      rows.push({
        name, name_ar, type, type_ar,
        category: spec.category,
        address, address_ar,
        lng: lon, lat,
        image_url: null,
        _tags: tags,
      })
    }
    console.log(`${filtered.length} (of ${elements.length})`)
    // Polite pause between Overpass queries (server enforces per-IP slots).
    await new Promise((r) => setTimeout(r, 5000))
  }

  console.log(`\nTotal rows to insert: ${rows.length}`)
  console.log('Resolving images…')
  await resolveImageUrls(rows)
  const withImages = rows.filter((r) => r.image_url).length
  console.log(`  ${withImages} row(s) got a real image; ${rows.length - withImages} will use category fallback`)

  console.log('Resolving missing addresses…')
  await resolveMissingAddresses(rows)

  console.log('Truncating places…')
  await prisma.$executeRaw`TRUNCATE TABLE places RESTART IDENTITY`

  console.log('Inserting…')
  let inserted = 0
  for (const r of rows) {
    try {
      await prisma.$executeRaw`
        INSERT INTO places (id, name, name_ar, type, type_ar, category, address, address_ar, image_url, location, created_at)
        VALUES (
          gen_random_uuid()::text,
          ${r.name}, ${r.name_ar},
          ${r.type}, ${r.type_ar},
          ${r.category}::"category",
          ${r.address}, ${r.address_ar},
          ${r.image_url},
          ST_SetSRID(ST_MakePoint(${r.lng}, ${r.lat}), 4326),
          NOW()
        )
      `
      inserted++
      if (inserted % 100 === 0) process.stdout.write(`  ${inserted}…\n`)
    } catch (err) {
      console.warn(`  skip "${r.name}":`, (err as Error).message)
    }
  }

  console.log(`\nInserted ${inserted} places.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
