import type { Decorator, Meta, StoryObj } from '@storybook/react'
import PrayerStatusPill from './PrayerStatusPill'
import type { HijriDate, PrayerTimes } from '../utils/prayerTimes'

function todayKey(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

const seedPrayer = (times: PrayerTimes, hijri: HijriDate | null = null): Decorator => {
  const SeedPrayerDecorator: Decorator = (Story) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'riyadhFlowPrayerTimes',
        JSON.stringify({ dateKey: todayKey(), times, hijri }),
      )
    }
    return <Story />
  }
  return SeedPrayerDecorator
}

// Construct prayer times relative to "now" so the countdown renders predictably
// regardless of when the story is viewed.
function offsetTimes(offsets: { fajr: number; dhuhr: number; asr: number; maghrib: number; isha: number }): PrayerTimes {
  const now = new Date()
  const minutesOfDay = now.getHours() * 60 + now.getMinutes()
  const toHHMM = (mins: number) => {
    const wrapped = ((mins % 1440) + 1440) % 1440
    const h = Math.floor(wrapped / 60)
    const m = wrapped % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  return {
    Fajr: toHHMM(minutesOfDay + offsets.fajr),
    Dhuhr: toHHMM(minutesOfDay + offsets.dhuhr),
    Asr: toHHMM(minutesOfDay + offsets.asr),
    Maghrib: toHHMM(minutesOfDay + offsets.maghrib),
    Isha: toHHMM(minutesOfDay + offsets.isha),
  }
}

const HIJRI_TODAY: HijriDate = {
  day: '22',
  year: '1447',
  monthEn: 'Ramadan',
  monthAr: 'رمضان',
}

const meta: Meta<typeof PrayerStatusPill> = {
  title: 'Prayer/PrayerStatusPill',
  component: PrayerStatusPill,
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
type Story = StoryObj<typeof PrayerStatusPill>

// Maghrib in ~2h — calm slate-style pill.
export const Default: Story = {
  decorators: [
    seedPrayer(
      offsetTimes({ fajr: -480, dhuhr: -240, asr: -60, maghrib: 120, isha: 210 }),
      HIJRI_TODAY,
    ),
  ],
}

// Next prayer is within 30 min — earned emerald `is-soon` state.
export const Imminent: Story = {
  decorators: [
    seedPrayer(
      offsetTimes({ fajr: -480, dhuhr: -240, asr: -60, maghrib: 14, isha: 105 }),
      HIJRI_TODAY,
    ),
  ],
}
