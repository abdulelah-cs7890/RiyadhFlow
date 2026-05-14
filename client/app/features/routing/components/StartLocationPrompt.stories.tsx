import type { Meta, StoryObj } from '@storybook/react'
import StartLocationPrompt from './StartLocationPrompt'

const meta: Meta<typeof StartLocationPrompt> = {
  title: 'Routing/StartLocationPrompt',
  component: StartLocationPrompt,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', minHeight: '480px', background: '#e2e8f0' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof StartLocationPrompt>

export const Default: Story = {
  args: {
    open: true,
    onClose: () => console.log('close'),
    onUseCurrentLocation: () => console.log('use current location'),
  },
}

export const Locating: Story = {
  args: {
    ...Default.args,
    isLocating: true,
  },
}
