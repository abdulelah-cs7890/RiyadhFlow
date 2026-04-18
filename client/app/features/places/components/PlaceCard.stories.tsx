import type { Meta, StoryObj } from '@storybook/react'
import PlaceCard from './PlaceCard'

const meta: Meta<typeof PlaceCard> = {
  title: 'Places/PlaceCard',
  component: PlaceCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', minHeight: '640px', background: '#cbd5e1', padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PlaceCard>;

export const Default: Story = {
  args: {
    place: {
      name: 'The Globe',
      coords: [46.6845, 24.6908],
      image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800&q=80',
      rating: 4.8,
      reviews: 1540,
      type: 'Fine Dining',
      address: 'Al Faisaliah Tower, Riyadh',
      about: 'Luxury dining inside the iconic glass sphere with panoramic city views.',
    },
    onClose: () => console.log('close'),
    onDirections: (name) => console.log('directions', name),
  },
};
