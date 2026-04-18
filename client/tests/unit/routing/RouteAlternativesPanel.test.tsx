import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import RouteAlternativesPanel from '@/app/features/routing/components/RouteAlternativesPanel'

describe('RouteAlternativesPanel', () => {
  it('renders alternatives and triggers onSelect', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <RouteAlternativesPanel
        alternatives={[
          { index: 0, distance: 11000, duration: 900 },
          { index: 1, distance: 12100, duration: 970 },
        ]}
        selectedIndex={0}
        onSelect={onSelect}
      />
    );

    await user.click(screen.getByRole('tab', { name: /balanced/i }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
