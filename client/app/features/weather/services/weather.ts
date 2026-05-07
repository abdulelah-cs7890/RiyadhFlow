import {
  classifyDust,
  codeToCondition,
  type WeatherSnapshot,
} from '../utils/weather'

const RIYADH_LAT = 24.7136
const RIYADH_LNG = 46.6753

const FORECAST_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${RIYADH_LAT}&longitude=${RIYADH_LNG}` +
  '&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&timezone=auto'

const AIR_QUALITY_URL =
  `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${RIYADH_LAT}&longitude=${RIYADH_LNG}` +
  '&current=pm10,dust&timezone=auto'

interface ForecastResponse {
  current?: {
    temperature_2m?: number
    weather_code?: number
    relative_humidity_2m?: number
    wind_speed_10m?: number
  }
}

interface AirQualityResponse {
  current?: {
    pm10?: number
    dust?: number
  }
}

export async function fetchWeather(signal?: AbortSignal): Promise<WeatherSnapshot | null> {
  const [forecastRes, airRes] = await Promise.allSettled([
    fetch(FORECAST_URL, { signal }).then((r) => r.json() as Promise<ForecastResponse>),
    fetch(AIR_QUALITY_URL, { signal }).then((r) => r.json() as Promise<AirQualityResponse>),
  ])

  if (forecastRes.status !== 'fulfilled') return null
  const cur = forecastRes.value.current
  if (!cur || typeof cur.temperature_2m !== 'number' || typeof cur.weather_code !== 'number') {
    return null
  }

  const air = airRes.status === 'fulfilled' ? airRes.value.current : undefined

  return {
    tempC: Math.round(cur.temperature_2m),
    condition: codeToCondition(cur.weather_code),
    humidity: Math.round(cur.relative_humidity_2m ?? 0),
    windKph: Math.round(cur.wind_speed_10m ?? 0),
    pm10: typeof air?.pm10 === 'number' ? Math.round(air.pm10) : null,
    dust: typeof air?.dust === 'number' ? Math.round(air.dust) : null,
  }
}

export { classifyDust }
