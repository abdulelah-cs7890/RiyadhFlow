import type { Meta, StoryObj } from '@storybook/react'
import CategoryBar from './CategoryBar'
import { categoryPills } from '../constants/categoryPills'

const meta: Meta<typeof CategoryBar> = {
  title: 'Places/CategoryBar',
  component: CategoryBar,
  tags: ['autodocs'],
  args: {
    categories: categoryPills,
    activeCategory: 'Restaurants',
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: '160px', background: '#e2e8f0' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CategoryBar>;

export const Default: Story = {
  args: {
    onCategoryChange: (nextCategory) => console.log('next category', nextCategory),
  },
};
