import type { Meta, StoryObj } from '@storybook/react'
import BestTimePanel from './BestTimePanel'

const meta: Meta<typeof BestTimePanel> = {
  title: 'Routing/BestTimePanel',
  component: BestTimePanel,
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
type Story = StoryObj<typeof BestTimePanel>

const RIYADH = [46.6753, 24.7136] as [number, number]
const KSU = [46.6217, 24.7218] as [number, number]

export const Idle: Story = {
  args: { startCoords: RIYADH, endCoords: KSU, travelMode: 'driving' },
}

export const MetroDisabled: Story = {
  args: { startCoords: RIYADH, endCoords: KSU, travelMode: 'metro' },
}

export const WalkDisabled: Story = {
  args: { startCoords: RIYADH, endCoords: KSU, travelMode: 'walking' },
}
