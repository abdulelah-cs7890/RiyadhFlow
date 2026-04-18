import { describe, expect, it } from 'vitest'
import { buildUrlWithRouteState, parseUrlRouteState } from '@/app/features/routing/utils/urlState'

describe('urlState utils', () => {
  it('parses start, destination, and category from query string', () => {
    const parsed = parseUrlRouteState('?start=KAFD&destination=Olaya&category=Transit');

    expect(parsed).toEqual({
      start: 'KAFD',
      destination: 'Olaya',
      category: 'Transit',
      mode: 'driving',
    });
  });

  it('ignores invalid category values', () => {
    const parsed = parseUrlRouteState('?start=A&destination=B&category=Unknown');
    expect(parsed.category).toBeNull();
  });

  it('builds a clean URL with only populated values', () => {
    const url = buildUrlWithRouteState('/',
      {
        start: 'King Saud University',
        destination: 'National Museum',
        category: 'Museums',
        mode: 'driving',
      });

    expect(url).toBe('/?start=King+Saud+University&destination=National+Museum&category=Museums');
  });
});
