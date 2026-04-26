export interface TrafficInsight {
  delayMins: number;
}

export function buildTrafficInsight(
  durationWithTraffic?: number,
  typicalDuration?: number,
): TrafficInsight {
  if (durationWithTraffic === undefined || typicalDuration === undefined) {
    return { delayMins: 0 };
  }
  const delayMins = Math.round((durationWithTraffic - typicalDuration) / 60);
  return { delayMins: Math.max(0, delayMins) };
}
