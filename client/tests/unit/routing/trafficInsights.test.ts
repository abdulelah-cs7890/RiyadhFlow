import { describe, expect, it } from 'vitest'
import { buildTrafficInsight, formatHourAmPm } from '@/app/features/routing/utils/trafficInsights'

describe('formatHourAmPm', () => {
  it('formats midnight as 12:00 AM', () => {
    expect(formatHourAmPm(0)).toBe('12:00 AM');
  });

  it('formats noon as 12:00 PM', () => {
    expect(formatHourAmPm(12)).toBe('12:00 PM');
  });

  it('formats 19 as 7:00 PM', () => {
    expect(formatHourAmPm(19)).toBe('7:00 PM');
  });
});

describe('buildTrafficInsight — real traffic data', () => {
  it('returns savedMins=0 when duration matches typical (no delay)', () => {
    const result = buildTrafficInsight(new Date('2026-04-11T10:00:00'), 600, 600);
    expect(result.savedMins).toBe(0);
  });

  it('calculates real delay minutes from API durations', () => {
    // 1200s actual vs 600s typical = 10 min delay
    const result = buildTrafficInsight(new Date('2026-04-11T10:00:00'), 1200, 600);
    expect(result.savedMins).toBe(10);
  });

  it('suggests 7 PM departure during peak hours with real traffic', () => {
    const result = buildTrafficInsight(new Date('2026-04-11T16:00:00'), 1800, 900);
    expect(result.bestTime).toBe('7:00 PM');
    expect(result.savedMins).toBe(15);
  });
});

describe('buildTrafficInsight — fallback (no real data)', () => {
  it('is deterministic — same input produces same output', () => {
    const date = new Date('2026-04-11T10:00:00');
    const r1 = buildTrafficInsight(date);
    const r2 = buildTrafficInsight(date);
    expect(r1.savedMins).toBe(r2.savedMins);
    expect(r1.bestTime).toBe(r2.bestTime);
  });

  it('applies peak-hour defaults for 3–6 PM', () => {
    const result = buildTrafficInsight(new Date('2026-04-11T17:00:00'));
    expect(result.bestTime).toBe('7:00 PM');
    expect(result.savedMins).toBe(20);
  });

  it('applies off-peak defaults outside 3–6 PM', () => {
    const result = buildTrafficInsight(new Date('2026-04-11T10:00:00'));
    expect(result.bestTime).toBe('11:00 AM');
    expect(result.savedMins).toBe(10);
  });
});
