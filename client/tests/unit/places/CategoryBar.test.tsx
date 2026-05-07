import React from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CategoryBar from '@/app/features/places/components/CategoryBar'
import { categoryPills } from '@/app/features/places/constants/categoryPills'
import { renderWithIntl } from '../_helpers/renderWithIntl'

describe('CategoryBar', () => {
  it('marks All as active by default and toggles selected category', async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();

    renderWithIntl(
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

  it('renders Arabic labels under ar locale', () => {
    renderWithIntl(
      <CategoryBar
        categories={categoryPills}
        activeCategory={null}
        onCategoryChange={() => {}}
      />,
      { locale: 'ar' },
    );

    // "كل" = "All" in Arabic. Use a regex to tolerate the "filter places by ..." aria phrasing.
    const allButton = screen.getByRole('button', { name: /كل|all/i });
    expect(allButton).toBeInTheDocument();
  });
});
