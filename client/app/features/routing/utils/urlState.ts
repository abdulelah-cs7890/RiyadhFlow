import { Category, CATEGORY_LABELS } from '@/app/utils/mockData';
import { TravelMode } from '../types';

export interface UrlRouteState {
  start: string;
  destination: string;
  category: Category | null;
  mode: TravelMode;
  startCoords?: [number, number];
  destCoords?: [number, number];
}

function parseCoords(raw: string | null): [number, number] | undefined {
  if (!raw) return undefined;
  const parts = raw.split(',').map(Number);
  if (parts.length !== 2 || parts.some(Number.isNaN)) return undefined;
  return [parts[0], parts[1]];
}

const VALID_MODES: TravelMode[] = ['driving', 'walking', 'cycling'];

export function isCategory(value: string | null): value is Category {
  return !!value && CATEGORY_LABELS.includes(value as Category);
}

function isTravelMode(value: string | null): value is TravelMode {
  return !!value && VALID_MODES.includes(value as TravelMode);
}

export function parseUrlRouteState(search: string): UrlRouteState {
  const params = new URLSearchParams(search);
  const categoryValue = params.get('category');
  const modeValue = params.get('mode');

  return {
    start: params.get('start') ?? '',
    destination: params.get('destination') ?? '',
    category: isCategory(categoryValue) ? categoryValue : null,
    mode: isTravelMode(modeValue) ? modeValue : 'driving',
    startCoords: parseCoords(params.get('sc')),
    destCoords: parseCoords(params.get('dc')),
  };
}

export function buildUrlWithRouteState(pathname: string, state: UrlRouteState): string {
  const params = new URLSearchParams();

  if (state.start) params.set('start', state.start);
  if (state.destination) params.set('destination', state.destination);
  if (state.category) params.set('category', state.category);
  if (state.mode !== 'driving') params.set('mode', state.mode);

  if (state.startCoords) params.set('sc', `${state.startCoords[0]},${state.startCoords[1]}`);
  if (state.destCoords) params.set('dc', `${state.destCoords[0]},${state.destCoords[1]}`);

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
