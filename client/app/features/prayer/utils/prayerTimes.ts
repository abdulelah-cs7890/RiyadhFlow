export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export const PRAYER_ORDER: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export type PrayerTimes = Record<PrayerName, string>;

export interface NextPrayer {
  name: PrayerName;
  minutesUntil: number;
  isTomorrow: boolean;
}

// Parses "HH:mm" (Aladhan API returns 24-hour times, sometimes with a suffix
// like " (+03)" — strip anything after whitespace).
export function parseHmToMinutes(value: string): number {
  const clean = value.split(' ')[0];
  const [h, m] = clean.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function minutesBetween(now: Date, timeStr: string): number {
  const target = parseHmToMinutes(timeStr);
  if (!Number.isFinite(target)) return NaN;
  return target - minutesOfDay(now);
}

export function nextPrayerAfter(now: Date, times: PrayerTimes): NextPrayer {
  const nowMins = minutesOfDay(now);
  for (const name of PRAYER_ORDER) {
    const mins = parseHmToMinutes(times[name]);
    if (!Number.isFinite(mins)) continue;
    if (mins > nowMins) {
      return { name, minutesUntil: mins - nowMins, isTomorrow: false };
    }
  }
  // Past Isha — wrap to tomorrow's Fajr
  const tomorrowFajrMins = parseHmToMinutes(times.Fajr);
  return {
    name: 'Fajr',
    minutesUntil: 24 * 60 - nowMins + tomorrowFajrMins,
    isTomorrow: true,
  };
}

export function isWithinWindow(
  now: Date,
  timeStr: string,
  windowMinutes: number,
): boolean {
  const delta = minutesBetween(now, timeStr);
  if (!Number.isFinite(delta)) return false;
  return delta >= 0 && delta <= windowMinutes;
}

export function isNowPrayer(
  now: Date,
  times: PrayerTimes,
  postWindowMinutes = 20,
): PrayerName | null {
  const nowMins = minutesOfDay(now);
  for (const name of PRAYER_ORDER) {
    const t = parseHmToMinutes(times[name]);
    if (!Number.isFinite(t)) continue;
    if (nowMins >= t && nowMins <= t + postWindowMinutes) return name;
  }
  return null;
}
