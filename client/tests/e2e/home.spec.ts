import { expect, test } from '@playwright/test'

test('core planning flow works and URL sync updates filters', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /riyadhflow/i })).toBeVisible();

  await page.getByPlaceholder('e.g., King Saud University').fill('King Saud University');
  await page.getByPlaceholder('e.g., Al Fayha').fill('National Museum');
  await page.getByRole('button', { name: /save/i }).click();

  await expect(page.getByText(/saved trips/i)).toBeVisible();
  await expect(page.getByText(/King Saud University/i)).toBeVisible();

  await page.getByRole('button', { name: /filter places by restaurants/i }).click();
  await expect(page).toHaveURL(/category=Restaurants/);

  await page.getByRole('button', { name: /filter places by all/i }).click();
  await expect(page).not.toHaveURL(/category=/);
});
