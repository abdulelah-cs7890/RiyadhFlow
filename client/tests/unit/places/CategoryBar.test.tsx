import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CategoryBar from '@/app/features/places/components/CategoryBar'
import { categoryPills } from '@/app/features/places/constants/categoryPills'

describe('CategoryBar', () => {
  it('marks All as active by default and toggles selected category', async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();

    render(
      <CategoryBar
        categories={categoryPills}
        activeCategory={null}
        onCategoryChange={onCategoryChange}
      />
    );

    const allButton = screen.getByRole('button', { name: /filter places by all/i });
    expect(allButton).toHaveAttribute('aria-pressed', 'true');

    const restaurantsButton = screen.getByRole('button', { name: /filter places by restaurants/i });
    await user.click(restaurantsButton);

    expect(onCategoryChange).toHaveBeenCalledWith('Restaurants');
  });
});
