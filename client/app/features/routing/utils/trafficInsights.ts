export interface TrafficInsight {
  bestTime: string;
  savedMins: number;
}

export function formatHourAmPm(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formatted = hour % 12 || 12;
  return `${formatted}:00 ${ampm}`;
}

export function buildTrafficInsight(
  date: Date,
  durationWithTraffic?: number,
  typicalDuration?: number,
): TrafficInsight {
  // Use real traffic data when available
  if (durationWithTraffic !== undefined && typicalDuration !== undefined) {
    const delayMins = Math.round((durationWithTraffic - typicalDuration) / 60);
    if (delayMins > 0) {
      const currentHour = date.getHours();
      const bestHour = currentHour >= 15 && currentHour <= 18 ? 19 : currentHour + 1;
      return {
        bestTime: formatHourAmPm(bestHour),
        savedMins: delayMins,
      };
    }
    // No meaningful delay — traffic is light
    return { bestTime: formatHourAmPm(date.getHours()), savedMins: 0 };
  }

  // Fallback: deterministic estimate based on time of day
  const currentHour = date.getHours();
  if (currentHour >= 15 && currentHour <= 18) {
    return { bestTime: formatHourAmPm(19), savedMins: 20 };
  }
  return { bestTime: formatHourAmPm(currentHour + 1), savedMins: 10 };
}
