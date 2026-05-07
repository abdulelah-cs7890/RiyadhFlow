export type WeatherCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'rain'
  | 'snow'
  | 'thunderstorm'

export interface WeatherSnapshot {
  tempC: number
  condition: WeatherCondition
  humidity: number
  windKph: number
  pm10: number | null
  dust: number | null
}

export interface DustState {
  level: 'normal' | 'dusty' | 'storm' | 'severe'
  pm10: number | null
  dust: number | null
}

// WMO weather codes → coarse condition buckets.
// https://open-meteo.com/en/docs (search "WMO Weather interpretation codes")
export function codeToCondition(code: number): WeatherCondition {
  if (code === 0) return 'clear'
  if (code === 1 || code === 2) return 'partly-cloudy'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 67) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 80 && code <= 86) return 'rain'
  if (code >= 95 && code <= 99) return 'thunderstorm'
  return 'clear'
}

export function conditionEmoji(c: WeatherCondition): string {
  switch (c) {
    case 'clear': return '☀️'
    case 'partly-cloudy': return '🌤️'
    case 'cloudy': return '☁️'
    case 'fog': return '🌫️'
    case 'rain': return '🌧️'
    case 'snow': return '❄️'
    case 'thunderstorm': return '⛈️'
  }
}

// Dust thresholds (μg/m³). Riyadh's PM10 baseline routinely sits at 100–200 even
// on clear days due to regional aridity, so we set the cutpoints higher than
// global WHO guidance: only flag a "storm" when concentrations are clearly
// above local background.
//   < 200   normal   (typical Riyadh day)
//   < 500   dusty    (notable haze)
//   < 1000  storm    (active dust event — limit walk/bike)
//   ≥ 1000  severe   (heavy dust storm — avoid outdoor exposure)
export function classifyDust(pm10: number | null, dust: number | null): DustState {
  const value = dust ?? pm10
  if (value == null) return { level: 'normal', pm10, dust }
  if (value >= 1000) return { level: 'severe', pm10, dust }
  if (value >= 500) return { level: 'storm', pm10, dust }
  if (value >= 200) return { level: 'dusty', pm10, dust }
  return { level: 'normal', pm10, dust }
}
