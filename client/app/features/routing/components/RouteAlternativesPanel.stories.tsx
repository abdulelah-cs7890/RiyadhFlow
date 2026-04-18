import type { Meta, StoryObj } from '@storybook/react'
import RouteAlternativesPanel from './RouteAlternativesPanel'

const meta: Meta<typeof RouteAlternativesPanel> = {
  title: 'Routing/RouteAlternativesPanel',
  component: RouteAlternativesPanel,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '380px', padding: '24px', background: '#f1f5f9' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RouteAlternativesPanel>;

export const Default: Story = {
  args: {
    alternatives: [
      { index: 0, distance: 12400, duration: 1180 },
      { index: 1, distance: 13100, duration: 1260 },
      { index: 2, distance: 10800, duration: 1375 },
    ],
    selectedIndex: 0,
    onSelect: (index) => console.log('select route index', index),
  },
};
