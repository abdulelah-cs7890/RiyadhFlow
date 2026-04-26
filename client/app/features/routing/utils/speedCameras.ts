export interface SpeedCamera {
  id: string;
  lng: number;
  lat: number;
  maxspeed?: number;
}

const EARTH_RADIUS_METERS = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineMeters(a: [number, number], b: [number, number]): number {
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(s));
}

function distancePointToSegmentMeters(
  point: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  // Cheap local planar projection (meters per degree). Accurate enough for
  // small segments at Riyadh's latitude — we only need "within 40 m or not".
  const latRef = toRad((a[1] + b[1]) / 2);
  const mPerDegLat = 111_132;
  const mPerDegLng = 111_320 * Math.cos(latRef);

  const toXY = (p: [number, number]) => [p[0] * mPerDegLng, p[1] * mPerDegLat];
  const [px, py] = toXY(point);
  const [ax, ay] = toXY(a);
  const [bx, by] = toXY(b);

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversineMeters(point, a);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return Math.sqrt(ex * ex + ey * ey);
}

export function camerasOnRoute(
  routeCoords: Array<[number, number]>,
  cameras: SpeedCamera[],
  thresholdMeters = 40,
): SpeedCamera[] {
  if (routeCoords.length < 2 || cameras.length === 0) return [];
  const matched: SpeedCamera[] = [];
  for (const cam of cameras) {
    const p: [number, number] = [cam.lng, cam.lat];
    let nearest = Infinity;
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const d = distancePointToSegmentMeters(p, routeCoords[i], routeCoords[i + 1]);
      if (d < nearest) nearest = d;
      if (nearest <= thresholdMeters) break;
    }
    if (nearest <= thresholdMeters) matched.push(cam);
  }
  return matched;
}

export function countCamerasOnRoute(
  routeCoords: Array<[number, number]>,
  cameras: SpeedCamera[],
  thresholdMeters = 40,
): number {
  return camerasOnRoute(routeCoords, cameras, thresholdMeters).length;
}
