import type { Decorator, Meta, StoryObj } from '@storybook/react'
import WeatherPill from './WeatherPill'
import type { WeatherSnapshot } from '../utils/weather'

const seedWeather = (snapshot: WeatherSnapshot): Decorator => {
  const SeedWeatherDecorator: Decorator = (Story) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'riyadhFlowWeather',
        JSON.stringify({ ts: Date.now(), snapshot }),
      )
    }
    return <Story />
  }
  return SeedWeatherDecorator
}

const meta: Meta<typeof WeatherPill> = {
  title: 'Weather/WeatherPill',
  component: WeatherPill,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: 24, background: '#ffffff', display: 'inline-flex' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof WeatherPill>

export const Clear: Story = {
  decorators: [
    seedWeather({ tempC: 32, condition: 'clear', humidity: 18, windKph: 8, pm10: 90, dust: 30 }),
  ],
}

export const Cloudy: Story = {
  decorators: [
    seedWeather({ tempC: 28, condition: 'cloudy', humidity: 42, windKph: 14, pm10: 100, dust: 50 }),
  ],
}

export const Dusty: Story = {
  decorators: [
    seedWeather({ tempC: 36, condition: 'fog', humidity: 22, windKph: 26, pm10: 320, dust: 280 }),
  ],
}

export const SevereDustStorm: Story = {
  decorators: [
    seedWeather({ tempC: 38, condition: 'fog', humidity: 18, windKph: 34, pm10: 1100, dust: 1200 }),
  ],
}
