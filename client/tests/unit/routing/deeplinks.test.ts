import { describe, expect, it } from 'vitest'
import { buildGoogleMapsUrl } from '@/app/features/routing/utils/deeplinks'

describe('buildGoogleMapsUrl', () => {
  it('builds a URL without waypoints', () => {
    const url = buildGoogleMapsUrl([46.67, 24.71], [46.71, 24.77], 'driving');
    expect(url).toBe(
      'https://www.google.com/maps/dir/?api=1&origin=24.71,46.67&destination=24.77,46.71&travelmode=driving',
    );
  });

  it('maps cycling to bicycling and metro to transit', () => {
    const cycling = buildGoogleMapsUrl([46.67, 24.71], [46.71, 24.77], 'cycling');
    expect(cycling).toContain('&travelmode=bicycling');

    const metro = buildGoogleMapsUrl([46.67, 24.71], [46.71, 24.77], 'metro');
    expect(metro).toContain('&travelmode=transit');
  });

  it('appends a single waypoint in lat,lng form', () => {
    const url = buildGoogleMapsUrl(
      [46.67, 24.71],
      [46.71, 24.77],
      'driving',
      [[46.69, 24.74]],
    );
    expect(url).toContain('&waypoints=24.74,46.69');
    expect(url).not.toContain('|');
  });

  it('joins multiple waypoints with a pipe in order', () => {
    const url = buildGoogleMapsUrl(
      [46.67, 24.71],
      [46.71, 24.77],
      'driving',
      [
        [46.69, 24.74],
        [46.72, 24.75],
      ],
    );
    expect(url).toContain('&waypoints=24.74,46.69|24.75,46.72');
  });

  it('omits waypoints segment when the array is empty', () => {
    const url = buildGoogleMapsUrl([46.67, 24.71], [46.71, 24.77], 'driving', []);
    expect(url).not.toContain('waypoints=');
  });

  it('URL-encodes string waypoint names', () => {
    const url = buildGoogleMapsUrl(
      'King Saud University',
      'National Museum',
      'driving',
      ['Al Olaya'],
    );
    expect(url).toContain('&origin=King%20Saud%20University');
    expect(url).toContain('&waypoints=Al%20Olaya');
  });
});
