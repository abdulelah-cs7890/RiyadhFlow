'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Feature, LineString } from 'geojson'
import { Category, PlaceData } from '../utils/mockData'
import { RouteAlternative, RouteInfo, TravelMode } from '../features/routing/types'
import type { TransitPlan } from '../features/routing/services/transitRouting'
import { reverseGeocode } from '../features/routing/services/geocoding'
import { camerasOnRoute, SpeedCamera } from '../features/routing/utils/speedCameras'
import speedCamerasData from '../features/routing/data/riyadh-speed-cameras.json'
import { CATEGORY_EMOJIS } from '../features/places/constants/categoryPills'
import { useLocale } from '../i18n/LocaleProvider'
import { useTranslations } from 'next-intl'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

if (typeof window !== 'undefined' && !mapboxgl.getRTLTextPluginStatus?.().includes('loaded')) {
  mapboxgl.setRTLTextPlugin(
    'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
    null,
    true,
  );
}

interface MapProps {
  routeCoords?: { start: number[]; end: number[] } | null;
  onRouteFetched?: (info: RouteInfo) => void;
  onRouteAlternativesFetched?: (alternatives: RouteAlternative[]) => void;
  selectedRouteIndex?: number;
  travelMode?: TravelMode;
  theme?: 'light' | 'dark';
  activeCategory?: Category | null;
  places?: PlaceData[];
  onPlaceClick?: (place: PlaceData) => void;
  flyToLocation?: [number, number] | null;
  userLocation?: [number, number] | null;
  fitRouteSignal?: number;
  onMapClick?: (coords: [number, number], placeName: string | null) => void;
  destPinCoords?: [number, number] | null;
  trafficVisible?: boolean;
  transitPlan?: TransitPlan | null;
  waypointCoords?: [number, number][];
}

interface MapboxStep {
  maneuver: { type: string; modifier?: string; instruction: string; location: [number, number] };
  distance: number;
  duration: number;
  name: string;
}

interface MapboxRoute {
  distance: number;
  duration: number;
  duration_typical?: number;
  geometry: {
    coordinates: [number, number][];
  };
  legs?: Array<{ summary?: string; steps?: MapboxStep[] }>;
}

interface DirectionsResponse {
  routes: MapboxRoute[];
}

// Riyadh metro bounding box (matches the OSM importer bbox). Used as the
// initial map view so Mapbox auto-fits to the viewport — wider screens get
// more detail, mobile naturally zooms further out to fit the same area.
const RIYADH_BOUNDS: [[number, number], [number, number]] = [
  [46.4, 24.5],   // SW
  [47.0, 24.95],  // NE
];
const ROUTE_SOURCE_ID = 'route';
const ROUTE_LAYER_ID = 'route';
const ALT_ROUTE_SOURCE_ID = 'route-alternatives';
const ALT_ROUTE_LAYER_ID = 'route-alternatives';

const TRAFFIC_SOURCE_ID = 'mapbox-traffic';
const TRAFFIC_LAYER_ID = 'traffic-flow';

const TRANSIT_WALK_SOURCE_ID = 'transit-walk';
const TRANSIT_WALK_LAYER_ID = 'transit-walk';
const TRANSIT_TRAIN_SOURCE_ID = 'transit-train';
const TRANSIT_TRAIN_LAYER_ID = 'transit-train';
const TRANSIT_STOPS_SOURCE_ID = 'transit-stops';
const TRANSIT_STOPS_LAYER_ID = 'transit-stops';

const SPEED_CAMERAS_SOURCE_ID = 'speed-cameras';
const SPEED_CAMERAS_LAYER_ID = 'speed-cameras';

const ALL_SPEED_CAMERAS = speedCamerasData as SpeedCamera[];

const SELECTED_ROUTE_COLOR = { light: '#0070f3', dark: '#38bdf8' };
const ALT_ROUTE_COLOR = { light: '#94a3b8', dark: '#64748b' };

function upsertRouteLayer(
  map: mapboxgl.Map,
  geojson: Feature<LineString>,
  theme: 'light' | 'dark',
) {
  const color = SELECTED_ROUTE_COLOR[theme];
  if (map.getSource(ROUTE_SOURCE_ID)) {
    (map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(geojson);
    if (map.getLayer(ROUTE_LAYER_ID)) {
      map.setPaintProperty(ROUTE_LAYER_ID, 'line-color', color);
    }
    return;
  }

  map.addLayer({
    id: ROUTE_LAYER_ID,
    type: 'line',
    source: {
      type: 'geojson',
      data: geojson,
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': color,
      'line-width': 5,
      'line-opacity': 0.9,
    },
  });
}

type FeatureCollection = { type: 'FeatureCollection'; features: Feature<LineString>[] };

function upsertAltRoutesLayer(
  map: mapboxgl.Map,
  data: FeatureCollection,
  theme: 'light' | 'dark',
) {
  const color = ALT_ROUTE_COLOR[theme];
  if (map.getSource(ALT_ROUTE_SOURCE_ID)) {
    (map.getSource(ALT_ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(data);
    if (map.getLayer(ALT_ROUTE_LAYER_ID)) {
      map.setPaintProperty(ALT_ROUTE_LAYER_ID, 'line-color', color);
    }
    return;
  }

  // Insert BELOW the selected route so the selected line stays on top.
  const beforeId = map.getLayer(ROUTE_LAYER_ID) ? ROUTE_LAYER_ID : undefined;
  map.addLayer({
    id: ALT_ROUTE_LAYER_ID,
    type: 'line',
    source: {
      type: 'geojson',
      data,
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': color,
      'line-width': 4,
      'line-opacity': 0.55,
    },
  }, beforeId);
}

function applyMapLanguage(map: mapboxgl.Map, locale: 'en' | 'ar') {
  const field = locale === 'ar'
    ? ['coalesce', ['get', 'name_ar'], ['get', 'name']]
    : ['coalesce', ['get', 'name_en'], ['get', 'name']];
  map.getStyle()?.layers?.forEach((layer) => {
    if (layer.type === 'symbol' && (layer.layout as Record<string, unknown>)?.['text-field'] !== undefined) {
      try { map.setLayoutProperty(layer.id, 'text-field', field as unknown as mapboxgl.Expression); } catch { /* ignore */ }
    }
  });
}

function addTrafficLayer(map: mapboxgl.Map) {
  if (!map.getSource(TRAFFIC_SOURCE_ID)) {
    map.addSource(TRAFFIC_SOURCE_ID, {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-traffic-v1',
    });
  }
  if (!map.getLayer(TRAFFIC_LAYER_ID)) {
    const layers = map.getStyle()?.layers ?? [];
    const roadLabelId = layers.find(
      (l) => l.type === 'symbol' && l.id.includes('road') && l.id.includes('label'),
    )?.id;
    const firstSymbolId = layers.find((l) => l.type === 'symbol')?.id;
    const beforeId = map.getLayer(ALT_ROUTE_LAYER_ID)
      ? ALT_ROUTE_LAYER_ID
      : map.getLayer(ROUTE_LAYER_ID)
        ? ROUTE_LAYER_ID
        : roadLabelId ?? firstSymbolId;
    map.addLayer({
      id: TRAFFIC_LAYER_ID,
      type: 'line',
      source: TRAFFIC_SOURCE_ID,
      'source-layer': 'traffic',
      paint: {
        'line-width': 2.5,
        'line-color': [
          'match',
          ['get', 'congestion'],
          'low', '#22c55e',
          'moderate', '#f59e0b',
          'heavy', '#ef4444',
          'severe', '#991b1b',
          '#64748b',
        ],
        'line-opacity': 0.7,
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    }, beforeId);
  }
}

function removeTrafficLayer(map: mapboxgl.Map) {
  try {
    if (map.getLayer(TRAFFIC_LAYER_ID)) map.removeLayer(TRAFFIC_LAYER_ID);
    if (map.getSource(TRAFFIC_SOURCE_ID)) map.removeSource(TRAFFIC_SOURCE_ID);
  } catch { /* already removed */ }
}

function getRouteBounds(coordinates: [number, number][]) {
  const bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);
  coordinates.slice(1).forEach((coord) => bounds.extend(coord));
  return bounds;
}

function clearCameraLayer(map: mapboxgl.Map) {
  try {
    if (map.getLayer(SPEED_CAMERAS_LAYER_ID)) map.removeLayer(SPEED_CAMERAS_LAYER_ID);
    if (map.getSource(SPEED_CAMERAS_SOURCE_ID)) map.removeSource(SPEED_CAMERAS_SOURCE_ID);
  } catch { /* already gone */ }
}

function drawCameras(map: mapboxgl.Map, cameras: SpeedCamera[]) {
  clearCameraLayer(map);
  if (cameras.length === 0) return;
  const features = cameras.map((c) => ({
    type: 'Feature' as const,
    properties: { id: c.id, maxspeed: c.maxspeed ?? null },
    geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
  }));
  map.addSource(SPEED_CAMERAS_SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features },
  });
  map.addLayer({
    id: SPEED_CAMERAS_LAYER_ID,
    type: 'circle',
    source: SPEED_CAMERAS_SOURCE_ID,
    paint: {
      'circle-radius': 5,
      'circle-color': '#ef4444',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
      'circle-opacity': 0.95,
    },
  });
}

function clearTransitLayers(map: mapboxgl.Map) {
  const ids = [
    [TRANSIT_STOPS_LAYER_ID, TRANSIT_STOPS_SOURCE_ID],
    [TRANSIT_WALK_LAYER_ID, TRANSIT_WALK_SOURCE_ID],
    [TRANSIT_TRAIN_LAYER_ID, TRANSIT_TRAIN_SOURCE_ID],
  ] as const;
  for (const [layer, source] of ids) {
    try {
      if (map.getLayer(layer)) map.removeLayer(layer);
      if (map.getSource(source)) map.removeSource(source);
    } catch { /* already gone */ }
  }
}

function drawTransitPlan(map: mapboxgl.Map, plan: TransitPlan) {
  clearTransitLayers(map);

  const walkFeatures: Feature<LineString>[] = [];
  const trainFeatures: Feature<LineString>[] = [];
  const stopCoords: [number, number][] = [];

  for (const leg of plan.legs) {
    if (leg.kind === 'walk') {
      walkFeatures.push({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [leg.from, leg.to],
        },
      });
    } else {
      trainFeatures.push({
        type: 'Feature',
        properties: { color: leg.lineColor },
        geometry: leg.geometry,
      });
      const first = leg.geometry.coordinates[0];
      const last = leg.geometry.coordinates[leg.geometry.coordinates.length - 1];
      if (first) stopCoords.push([first[0], first[1]]);
      if (last) stopCoords.push([last[0], last[1]]);
    }
  }

  map.addSource(TRANSIT_WALK_SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: walkFeatures },
  });
  map.addLayer({
    id: TRANSIT_WALK_LAYER_ID,
    type: 'line',
    source: TRANSIT_WALK_SOURCE_ID,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': '#64748b',
      'line-width': 3,
      'line-dasharray': [1.5, 1.5],
      'line-opacity': 0.85,
    },
  });

  map.addSource(TRANSIT_TRAIN_SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: trainFeatures },
  });
  map.addLayer({
    id: TRANSIT_TRAIN_LAYER_ID,
    type: 'line',
    source: TRANSIT_TRAIN_SOURCE_ID,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['coalesce', ['get', 'color'], '#0ea5e9'],
      'line-width': 5,
      'line-opacity': 0.95,
    },
  });

  const stopFeatures = stopCoords.map((c) => ({
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'Point' as const, coordinates: c },
  }));
  map.addSource(TRANSIT_STOPS_SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: stopFeatures },
  });
  map.addLayer({
    id: TRANSIT_STOPS_LAYER_ID,
    type: 'circle',
    source: TRANSIT_STOPS_SOURCE_ID,
    paint: {
      'circle-radius': 6,
      'circle-color': '#ffffff',
      'circle-stroke-width': 2.5,
      'circle-stroke-color': '#111827',
    },
  });
}

export default function Map({
  routeCoords,
  onRouteFetched,
  onRouteAlternativesFetched,
  selectedRouteIndex = 0,
  travelMode = 'driving',
  theme = 'light',
  activeCategory,
  places = [],
  onPlaceClick,
  flyToLocation,
  userLocation,
  fitRouteSignal,
  onMapClick,
  destPinCoords,
  trafficVisible = false,
  transitPlan = null,
  waypointCoords = [],
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const markerElementsRef = useRef<HTMLDivElement[]>([]);
  const routeAlternativesRef = useRef<MapboxRoute[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destPinRef = useRef<mapboxgl.Marker | null>(null);
  const routeBadgeRef = useRef<mapboxgl.Marker | null>(null);
  const { locale } = useLocale();
  const tMap = useTranslations('map');
  const tPlaces = useTranslations('places');
  const tMapRef = useRef(tMap);
  tMapRef.current = tMap;
  const tPlacesRef = useRef(tPlaces);
  tPlacesRef.current = tPlaces;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const trafficVisibleRef = useRef(trafficVisible);
  trafficVisibleRef.current = trafficVisible;
  const themeRef = useRef<'light' | 'dark'>(theme);
  themeRef.current = theme;
  const localeRef = useRef<'en' | 'ar'>(locale);
  localeRef.current = locale;
  const travelModeRef = useRef<TravelMode>(travelMode);
  travelModeRef.current = travelMode;
  const hasToken = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
  // Track map style load so markers aren't skipped when places arrive before the map is ready
  const [mapReady, setMapReady] = useState(false);

  const drawRouteByIndex = useCallback((index: number) => {
    const map = mapRef.current;
    if (!map || !routeAlternativesRef.current.length) return;

    const maxIndex = routeAlternativesRef.current.length - 1;
    const safeIndex = Math.min(Math.max(index, 0), maxIndex);
    const route = routeAlternativesRef.current[safeIndex];

    const matchedCameras = travelModeRef.current === 'driving'
      ? camerasOnRoute(route.geometry.coordinates, ALL_SPEED_CAMERAS)
      : [];

    if (onRouteFetched) {
      const rawSteps = route.legs?.[0]?.steps;
      onRouteFetched({
        distance: route.distance,
        duration: route.duration,
        duration_typical: route.duration_typical,
        steps: rawSteps?.map((s) => ({
          instruction: s.maneuver.instruction,
          distance: s.distance,
          duration: s.duration,
          maneuverType: s.maneuver.type,
          maneuverModifier: s.maneuver.modifier,
          roadName: s.name,
          location: s.maneuver.location,
        })),
        cameraCount: matchedCameras.length,
      });
    }

    const geojson: Feature<LineString> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: route.geometry.coordinates,
      },
    };

    const altFeatures: Feature<LineString>[] = routeAlternativesRef.current
      .map((r, i) => (i === safeIndex ? null : r))
      .filter((r): r is MapboxRoute => r !== null)
      .map((r) => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: r.geometry.coordinates },
      }));
    const altCollection: FeatureCollection = { type: 'FeatureCollection', features: altFeatures };

    const render = () => {
      upsertAltRoutesLayer(map, altCollection, themeRef.current);
      upsertRouteLayer(map, geojson, themeRef.current);
      drawCameras(map, matchedCameras);
    };
    if (map.isStyleLoaded()) {
      render();
    } else {
      map.once('load', render);
    }

    map.fitBounds(getRouteBounds(route.geometry.coordinates), { padding: 80, maxZoom: 14 });

    // Route distance/time badge at midpoint
    routeBadgeRef.current?.remove();
    const coords = route.geometry.coordinates;
    const midpoint = coords[Math.floor(coords.length / 2)];
    const km = (route.distance / 1000).toFixed(1);
    const mins = Math.round(route.duration / 60);
    const badgeEl = document.createElement('div');
    badgeEl.className = 'route-badge';
    badgeEl.textContent = tMapRef.current('routeBadge', { mins, km });
    routeBadgeRef.current = new mapboxgl.Marker({ element: badgeEl, anchor: 'center' })
      .setLngLat(midpoint as [number, number])
      .addTo(map);
  }, [onRouteFetched]);

  useEffect(() => {
    if (!hasToken || !mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      bounds: RIYADH_BOUNDS,
      fitBoundsOptions: { padding: 40 },
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      setMapReady(true);
      applyMapLanguage(map, localeRef.current);
    });

    map.on('click', async (e) => {
      const target = e.originalEvent.target as HTMLElement;
      if (target.closest('.custom-marker')) return;

      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      if (destPinRef.current) {
        destPinRef.current.setLngLat(coords);
      } else {
        const el = document.createElement('div');
        el.className = 'custom-marker custom-marker--dest-pin';
        destPinRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat(coords)
          .addTo(map);
      }

      const name = await reverseGeocode(coords);
      onMapClickRef.current?.(coords, name);
    });

    mapRef.current = map;

    return () => {
      if (process.env.NODE_ENV === 'development') return;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      markerElementsRef.current = [];
      routeAlternativesRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [hasToken]);

  // Sync destination pin marker with parent state (remove on reset)
  useEffect(() => {
    if (!destPinCoords) {
      destPinRef.current?.remove();
      destPinRef.current = null;
    }
  }, [destPinCoords]);

  // Fly to a specific location (e.g. step click)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToLocation) return;
    map.flyTo({ center: flyToLocation, zoom: 16 });
  }, [flyToLocation]);

  // Recenter on current route — fires whenever fitRouteSignal changes (button click)
  useEffect(() => {
    if (fitRouteSignal === undefined) return;
    const map = mapRef.current;
    const routes = routeAlternativesRef.current;
    if (!map || !routes.length) return;

    const safeIndex = Math.min(Math.max(selectedRouteIndex, 0), routes.length - 1);
    const coords = routes[safeIndex].geometry.coordinates;
    map.fitBounds(getRouteBounds(coords), { padding: 80, maxZoom: 14 });
  }, [fitRouteSignal, selectedRouteIndex]);

  // User-location puck — persistent pulsing dot wherever the user's GPS last resolved
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(userLocation);
      return;
    }

    const el = document.createElement('div');
    el.className = 'user-location-puck';
    el.innerHTML = '<span class="user-location-pulse"></span><span class="user-location-dot"></span>';
    userMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat(userLocation)
      .addTo(map);
  }, [userLocation]);

  // Switch Mapbox style when theme changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const targetStyle = theme === 'dark'
      ? 'mapbox://styles/mapbox/dark-v11'
      : 'mapbox://styles/mapbox/streets-v11';

      if (!map.isStyleLoaded()) return; // 👈 ADD THIS SAFETY GUARD
      
    // Skip if the style already matches (avoids abort on initial mount / strict mode double-fire)
    const currentStyle = map.getStyle()?.sprite;
    if (currentStyle?.includes(theme === 'dark' ? 'dark-v11' : 'streets-v11')) return;

    try {
      map.setStyle(targetStyle);
    } catch {
      // Mapbox can throw AbortError if a previous style load is still in flight
      return;
    }

    // setStyle clears all layers/sources — re-draw route + traffic once new style loads
    map.once('style.load', () => {
      if (routeAlternativesRef.current.length) {
        drawRouteByIndex(0);
      }
      if (trafficVisibleRef.current) {
        addTrafficLayer(map);
      }
      applyMapLanguage(map, localeRef.current);
    });
  }, [theme, drawRouteByIndex]);

  // Re-apply map language when locale changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (map.isStyleLoaded()) {
      applyMapLanguage(map, locale);
    }
  }, [locale, mapReady]);

  // Toggle traffic layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const apply = () => {
      if (trafficVisible) {
        addTrafficLayer(map);
      } else {
        removeTrafficLayer(map);
      }
    };

    if (map.isStyleLoaded()) apply();
    else map.once('style.load', apply);
  }, [trafficVisible, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!routeCoords) {
      routeAlternativesRef.current = [];
      routeBadgeRef.current?.remove();
      routeBadgeRef.current = null;
      const clearLayer = () => {
        try {
          if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
          if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
          if (map.getLayer(ALT_ROUTE_LAYER_ID)) map.removeLayer(ALT_ROUTE_LAYER_ID);
          if (map.getSource(ALT_ROUTE_SOURCE_ID)) map.removeSource(ALT_ROUTE_SOURCE_ID);
          clearCameraLayer(map);
        } catch { /* style swapping — layer already gone */ }
      };
      if (map.isStyleLoaded()) clearLayer();
      else map.once('style.load', clearLayer);
      return;
    }

    // Metro mode: render transit plan via its own GeoJSON layers; skip Directions.
    if (travelMode === 'metro') {
      routeAlternativesRef.current = [];
      if (onRouteAlternativesFetched) onRouteAlternativesFetched([]);
      const clearDirections = () => {
        try {
          if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
          if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
          if (map.getLayer(ALT_ROUTE_LAYER_ID)) map.removeLayer(ALT_ROUTE_LAYER_ID);
          if (map.getSource(ALT_ROUTE_SOURCE_ID)) map.removeSource(ALT_ROUTE_SOURCE_ID);
          clearCameraLayer(map);
        } catch { /* ignore */ }
      };
      if (map.isStyleLoaded()) clearDirections();
      else map.once('style.load', clearDirections);
      return;
    }

    const { start, end } = routeCoords;
    routeAlternativesRef.current = [];
    if (onRouteAlternativesFetched) onRouteAlternativesFetched([]);

    async function getRouteAlternatives() {
      const altParam = travelMode === 'driving' && waypointCoords.length === 0 ? '&alternatives=true' : '';
      const waypointsSegment = waypointCoords.map((c) => `${c[0]},${c[1]}`).join(';');
      const pathCoords = waypointsSegment
        ? `${start[0]},${start[1]};${waypointsSegment};${end[0]},${end[1]}`
        : `${start[0]},${start[1]};${end[0]},${end[1]}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${pathCoords}?overview=full&geometries=geojson&steps=true${altParam}&access_token=${mapboxgl.accessToken}`;

      try {
        const query = await fetch(url);
        const json = (await query.json()) as DirectionsResponse;
        const routes = json.routes ?? [];
        if (!routes.length) throw new Error('No route data returned from Mapbox.');

        routeAlternativesRef.current = routes;
        if (onRouteAlternativesFetched) {
          onRouteAlternativesFetched(
            routes.map((route, index) => ({
              index,
              distance: route.distance,
              duration: route.duration,
              summary: route.legs?.[0]?.summary,
            }))
          );
        }

        drawRouteByIndex(0);
      } catch (error) {
        console.error('Error drawing route:', error);
      }
    }

    void getRouteAlternatives();
  }, [drawRouteByIndex, onRouteAlternativesFetched, routeCoords, travelMode, waypointCoords]);

  useEffect(() => {
    if (!routeAlternativesRef.current.length) return;
    drawRouteByIndex(selectedRouteIndex);
  }, [drawRouteByIndex, selectedRouteIndex]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const render = () => {
      if (!transitPlan || travelMode !== 'metro') {
        clearTransitLayers(map);
        return;
      }
      drawTransitPlan(map, transitPlan);

      const allCoords: [number, number][] = [];
      for (const leg of transitPlan.legs) {
        if (leg.kind === 'walk') {
          allCoords.push(leg.from, leg.to);
        } else {
          for (const c of leg.geometry.coordinates) allCoords.push(c as [number, number]);
        }
      }
      if (allCoords.length >= 2) {
        const bounds = getRouteBounds(allCoords);
        map.fitBounds(bounds, { padding: 80, duration: 600, maxZoom: 14 });
      }
    };

    if (map.isStyleLoaded()) render();
    else map.once('style.load', render);
  }, [transitPlan, travelMode, mapReady]);

  // mapReady in deps ensures this re-runs once the map style is loaded,
  // so markers added before the map was ready get a second chance.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    markerElementsRef.current = [];

    if (!places.length) return;

    const activeEmoji = activeCategory ? CATEGORY_EMOJIS[activeCategory] : undefined;

    places.forEach((loc) => {
      const markerEl = document.createElement('div');
      markerEl.className = 'custom-marker custom-marker--place';
      const emoji = activeEmoji ?? (loc.category ? CATEGORY_EMOJIS[loc.category] : undefined);
      if (emoji) {
        markerEl.textContent = emoji;
        markerEl.classList.add('custom-marker--emoji');
      }
      markerEl.setAttribute('role', 'button');
      markerEl.setAttribute('tabindex', '0');
      markerEl.setAttribute('aria-label', tPlacesRef.current('viewDetails', { name: loc.name }));
      markerElementsRef.current.push(markerEl);

      const handleSelect = () => {
        markerElementsRef.current.forEach((element) => element.classList.remove('is-selected'));
        markerEl.classList.add('is-selected');
        if (onPlaceClick) onPlaceClick(loc);
        map.flyTo({ center: loc.coords, zoom: 14 });
      };

      markerEl.addEventListener('click', handleSelect);
      markerEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelect();
        }
      });

      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat(loc.coords)
        .addTo(map);

      markersRef.current.push(marker);
    });

    if (places.length === 1) {
      map.flyTo({ center: places[0].coords, zoom: 13 });
      return;
    }

    const bounds = new mapboxgl.LngLatBounds(
      places[0].coords as [number, number],
      places[0].coords as [number, number]
    );
    places.slice(1).forEach((loc) => bounds.extend(loc.coords as [number, number]));
    map.fitBounds(bounds, { padding: 120, maxZoom: 13 });
  }, [activeCategory, places, onPlaceClick, mapReady]);

  if (!hasToken) {
    return (
      <div className="map-fallback" role="status" aria-live="polite">
        {tMap('fallback')}
      </div>
    );
  }

  return <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />;
}
