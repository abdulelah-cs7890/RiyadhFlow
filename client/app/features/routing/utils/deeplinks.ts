import { TravelMode } from '../types';

const GOOGLE_MODE: Record<TravelMode, string> = {
  driving: 'driving',
  walking: 'walking',
  cycling: 'bicycling',
};

function formatEndpoint(endpoint: [number, number] | string): string {
  if (typeof endpoint === 'string') return encodeURIComponent(endpoint);
  // Mapbox stores [lng, lat]; Google Maps expects lat,lng.
  const [lng, lat] = endpoint;
  return `${lat},${lng}`;
}

export function buildGoogleMapsUrl(
  origin: [number, number] | string,
  destination: [number, number] | string,
  travelMode: TravelMode,
): string {
  return 'https://www.google.com/maps/dir/?api=1'
    + `&origin=${formatEndpoint(origin)}`
    + `&destination=${formatEndpoint(destination)}`
    + `&travelmode=${GOOGLE_MODE[travelMode]}`;
}
