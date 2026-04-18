const RIYADH_BBOX = '46.43,24.43,46.97,24.97';
const RIYADH_PROXIMITY = '46.6753,24.7136';

interface ForwardFeature {
  geometry?: { coordinates?: [number, number] };
}

interface ForwardResponse {
  features?: ForwardFeature[];
}

export async function reverseGeocode(
  coords: [number, number],
  signal?: AbortSignal,
): Promise<string | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const [lng, lat] = coords;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&language=en&limit=1`;

  try {
    const response = await fetch(url, { signal });
    const data = (await response.json()) as { features?: Array<{ place_name?: string; text?: string }> };
    const feature = data.features?.[0];
    return feature?.text ?? feature?.place_name ?? null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

export async function getCoordinates(query: string, signal?: AbortSignal): Promise<[number, number] | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const url = `https://api.mapbox.com/search/searchbox/v1/forward`
    + `?q=${encodeURIComponent(query)}`
    + `&access_token=${token}`
    + `&proximity=${RIYADH_PROXIMITY}`
    + `&bbox=${RIYADH_BBOX}`
    + `&country=SA`
    + `&language=en`
    + `&limit=1`;

  try {
    const response = await fetch(url, { signal });
    const data = (await response.json()) as ForwardResponse;
    return data.features?.[0]?.geometry?.coordinates ?? null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    console.error('Geocoding error:', error);
    return null;
  }
}
