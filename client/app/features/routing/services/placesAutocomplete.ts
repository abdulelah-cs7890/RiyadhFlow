import { Suggestion } from './searchSuggestions'

interface DbRow {
  id: string
  name: string
  name_ar: string | null
  address: string
  address_ar: string | null
  lng: number
  lat: number
}

export async function fetchDbSuggestions(
  query: string,
  lang: 'en' | 'ar',
  signal?: AbortSignal,
  anchor?: [number, number] | null,
): Promise<Suggestion[]> {
  if (query.length < 2) return []
  try {
    const anchorQs = anchor
      ? `&lng=${encodeURIComponent(anchor[0])}&lat=${encodeURIComponent(anchor[1])}`
      : ''
    const res = await fetch(
      `/api/places/search?q=${encodeURIComponent(query)}${anchorQs}`,
      { signal },
    )
    if (!res.ok) return []
    const rows = (await res.json()) as DbRow[]
    return rows.map((r): Suggestion => ({
      source: 'db',
      id: r.id,
      name: lang === 'ar' && r.name_ar ? r.name_ar : r.name,
      place_formatted:
        lang === 'ar' && r.address_ar ? r.address_ar : r.address,
      coords: [Number(r.lng), Number(r.lat)],
    }))
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return []
    return []
  }
}
