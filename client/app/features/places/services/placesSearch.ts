import { Category, PlaceData, mockCategoryData } from '@/app/utils/mockData';

const RIYADH_PROXIMITY = '46.6753,24.7136';

const CATEGORY_TO_ENUM: Record<Category, string> = {
  'Restaurants': 'RESTAURANTS',
  'Hotels': 'HOTELS',
  'Things to do': 'THINGS_TO_DO',
  'Museums': 'MUSEUMS',
  'Transit': 'TRANSIT',
  'Pharmacies': 'PHARMACIES',
  'Gyms': 'GYMS',
};

interface DbPlaceRow {
  name: string;
  name_ar: string | null;
  type: string;
  type_ar: string | null;
  address: string;
  address_ar: string | null;
  about: string | null;
  about_ar: string | null;
  image_url: string | null;
  rating: number | null;
  reviews: number | null;
  lng: number;
  lat: number;
}

export async function fetchPlacesFromDb(
  category: Category,
  opts?: { lat?: number; lng?: number; radius?: number },
  signal?: AbortSignal,
): Promise<PlaceData[]> {
  const params = new URLSearchParams({ category: CATEGORY_TO_ENUM[category] });
  if (opts?.lat != null && opts?.lng != null) {
    params.set('lat', String(opts.lat));
    params.set('lng', String(opts.lng));
    if (opts.radius) params.set('radius', String(opts.radius));
  }
  const res = await fetch(`/api/places?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`Places API failed: ${res.status}`);
  const rows = (await res.json()) as DbPlaceRow[];
  return rows.map((r) => ({
    name: r.name,
    name_ar: r.name_ar ?? undefined,
    type: r.type,
    type_ar: r.type_ar ?? undefined,
    address: r.address,
    address_ar: r.address_ar ?? undefined,
    about: r.about ?? undefined,
    about_ar: r.about_ar ?? undefined,
    image: r.image_url ?? undefined,
    rating: r.rating ?? undefined,
    reviews: r.reviews ?? undefined,
    coords: [Number(r.lng), Number(r.lat)],
  }));
}

const CATEGORY_CANONICAL: Record<Category, string> = {
  'Restaurants': 'restaurant',
  'Hotels': 'hotel',
  'Things to do': 'attraction',
  'Museums': 'museum',
  'Transit': 'transit_station',
  'Pharmacies': 'pharmacy',
  'Gyms': 'gym',
};

const CATEGORY_DEFAULT_IMAGES: Record<Category, string> = {
  'Restaurants': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
  'Hotels': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
  'Things to do': 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&q=80',
  'Museums': 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800&q=80',
  'Transit': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80',
  'Pharmacies': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80',
  'Gyms': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
};

interface SearchboxFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name: string;
    full_address?: string;
    place_formatted?: string;
  };
}

interface SearchboxResponse {
  features?: SearchboxFeature[];
}

export async function fetchPlacesByCategory(
  category: Category,
  signal?: AbortSignal,
): Promise<PlaceData[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Always start with the curated mock places for this category
  const fallback: PlaceData[] = mockCategoryData[category] ?? [];

  if (!token) return fallback;

  const canonicalName = CATEGORY_CANONICAL[category];
  const url = `https://api.mapbox.com/search/searchbox/v1/category/${canonicalName}?access_token=${token}&proximity=${RIYADH_PROXIMITY}&limit=10&country=SA&language=en`;

  try {
    const response = await fetch(url, { signal });
    const data = (await response.json()) as SearchboxResponse;
    const features = data.features ?? [];

    if (features.length === 0) return fallback;

    return features.map((feature) => ({
      name: feature.properties.name,
      coords: feature.geometry.coordinates,
      type: category,
      address: feature.properties.full_address ?? feature.properties.place_formatted ?? '',
      image: CATEGORY_DEFAULT_IMAGES[category],
    }));
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return [];
    console.error('Places search error:', error);
    return fallback;
  }
}
