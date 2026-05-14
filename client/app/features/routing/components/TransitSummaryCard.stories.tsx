import type { Meta, StoryObj } from '@storybook/react'
import TransitSummaryCard from './TransitSummaryCard'
import type { TransitPlan } from '../services/transitRouting'

const meta: Meta<typeof TransitSummaryCard> = {
  title: 'Routing/TransitSummaryCard',
  component: TransitSummaryCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360, padding: 24, background: '#f8fafc' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof TransitSummaryCard>

const mockPlan: TransitPlan = {
  kind: 'route',
  totalMinutes: 28,
  walkMinutes: 8,
  trainMinutes: 20,
  transferCount: 1,
  legs: [
    {
      kind: 'walk',
      from: [46.6753, 24.7136],
      to: [46.6800, 24.7150],
      minutes: 4,
      meters: 320,
      toStationName: { en: 'KAFD', ar: 'مركز الملك عبدالله المالي' },
    },
    {
      kind: 'train',
      lineId: 'blue',
      lineColor: '#1e3a8a',
      lineNameEn: 'Blue Line',
      lineNameAr: 'الخط الأزرق',
      boardStationId: 'kafd',
      boardStationName: { en: 'KAFD', ar: 'مركز الملك عبدالله المالي' },
      alightStationId: 'olaya',
      alightStationName: { en: 'Olaya', ar: 'العليا' },
      stopCount: 5,
      minutes: 12,
      geometry: { type: 'LineString', coordinates: [[46.68, 24.715], [46.685, 24.71], [46.69, 24.705]] },
    },
    {
      kind: 'train',
      lineId: 'red',
      lineColor: '#dc2626',
      lineNameEn: 'Red Line',
      lineNameAr: 'الخط الأحمر',
      boardStationId: 'olaya',
      boardStationName: { en: 'Olaya', ar: 'العليا' },
      alightStationId: 'qasr-al-hokm',
      alightStationName: { en: 'Qasr Al Hokm', ar: 'قصر الحكم' },
      stopCount: 3,
      minutes: 8,
      geometry: { type: 'LineString', coordinates: [[46.69, 24.705], [46.71, 24.69], [46.72, 24.685]] },
    },
    {
      kind: 'walk',
      from: [46.72, 24.685],
      to: [46.7220, 24.6845],
      minutes: 4,
      meters: 280,
      fromStationName: { en: 'Qasr Al Hokm', ar: 'قصر الحكم' },
    },
  ],
}

export const Default: Story = {
  args: { plan: mockPlan },
}
