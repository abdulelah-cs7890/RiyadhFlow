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

const ENUM_TO_CATEGORY: Record<string, Category> = {
  RESTAURANTS: 'Restaurants',
  HOTELS: 'Hotels',
  THINGS_TO_DO: 'Things to do',
  MUSEUMS: 'Museums',
  TRANSIT: 'Transit',
  PHARMACIES: 'Pharmacies',
  GYMS: 'Gyms',
};

interface DbPlaceRow {
  name: string;
  name_ar: string | null;
  type: string;
  type_ar: string | null;
  category: string;
  address: string;
  address_ar: string | null;
  about: string | null;
  about_ar: string | null;
  image_url: string | null;
  rating: number | null;
  reviews: number | null;
  lng: number;
  lat: number;
  distance_m: number | null;
}

export async function fetchPlacesFromDb(
  category: Category | null,
  opts?: { lat?: number; lng?: number; radius?: number },
  signal?: AbortSignal,
): Promise<PlaceData[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', CATEGORY_TO_ENUM[category]);
  if (opts?.lat != null && opts?.lng != null) {
    params.set('lat', String(opts.lat));
    params.set('lng', String(opts.lng));
    if (opts.radius) params.set('radius', String(opts.radius));
  }
  const res = await fetch(`/api/places?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`Places API failed: ${res.status}`);
  const rows = (await res.json()) as DbPlaceRow[];
  return rows.map((r) => {
    const cat = ENUM_TO_CATEGORY[r.category];
    return {
      name: r.name,
      name_ar: r.name_ar ?? undefined,
      type: r.type,
      type_ar: r.type_ar ?? undefined,
      address: r.address,
      address_ar: r.address_ar ?? undefined,
      about: r.about ?? undefined,
      about_ar: r.about_ar ?? undefined,
      image: r.image_url ?? (cat ? CATEGORY_DEFAULT_IMAGES[cat] : undefined),
      rating: r.rating ?? undefined,
      reviews: r.reviews ?? undefined,
      coords: [Number(r.lng), Number(r.lat)],
      distance_m: r.distance_m ?? undefined,
      category: cat,
    };
  });
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
  'Restaurants': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
  'Hotels': 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
  'Things to do': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
  'Museums': 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80',
  'Transit': 'https://commons.wikimedia.org/wiki/Special:FilePath/Riyadh%20Metro%20%282024%29.jpg?width=800',
  'Pharmacies': 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=800&q=80',
  'Gyms': 'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=800&q=80',
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
