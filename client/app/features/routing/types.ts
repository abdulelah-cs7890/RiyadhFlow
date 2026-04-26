export type TravelMode = 'driving' | 'walking' | 'cycling' | 'metro';

export interface RouteAlternative {
  index: number;
  distance: number;
  duration: number;
  summary?: string;
}

export const ROUTE_LABEL_KEYS = ['fastest', 'balanced', 'eco'] as const;
export type RouteLabelKey = typeof ROUTE_LABEL_KEYS[number];

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuverType: string;
  maneuverModifier?: string;
  roadName: string;
  location: [number, number];
}

export interface RouteInfo {
  distance: number;
  duration: number;
  duration_typical?: number;
  steps?: RouteStep[];
  cameraCount?: number;
}

export interface Waypoint {
  name: string;
  coords: [number, number] | null;
}

export const MAX_WAYPOINTS = 2;
