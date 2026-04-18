const RIYADH_PROXIMITY = '46.6753,24.7136';

export interface Suggestion {
  mapbox_id: string;
  name: string;
  full_address?: string;
  place_formatted?: string;
}

interface SuggestResponse {
  suggestions?: Suggestion[];
}

interface RetrieveFeature {
  geometry: { coordinates: [number, number] };
  properties: { name: string; full_address?: string };
}

interface RetrieveResponse {
  features?: RetrieveFeature[];
}

export async function fetchSuggestions(
  query: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<Suggestion[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || query.length < 2) return [];

  const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(query)}&access_token=${token}&proximity=${RIYADH_PROXIMITY}&country=SA&language=en&limit=5&session_token=${sessionToken}`;

  try {
    const res = await fetch(url, { signal });
    const data = (await res.json()) as SuggestResponse;
    return data.suggestions ?? [];
  } catch (err) {
    // Abort is expected (user kept typing / cleared / reset) — not an error.
    if (err instanceof Error && err.name === 'AbortError') return [];
    throw err;
  }
}

export async function retrieveSuggestion(
  mapboxId: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<{ name: string; coords: [number, number] } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${mapboxId}?access_token=${token}&session_token=${sessionToken}&language=en`;

  const res = await fetch(url, { signal });
  const data = (await res.json()) as RetrieveResponse;
  const feature = data.features?.[0];
  if (!feature) return null;

  return {
    name: feature.properties.name,
    coords: feature.geometry.coordinates,
  };
}
