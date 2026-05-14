import { expect, test } from '@playwright/test'

test('core planning flow works and URL sync updates filters', async ({ page }) => {
  // Pre-dismiss the first-visit onboarding overlay so its modal backdrop
  // doesn't intercept clicks on the category bar later in the flow.
  await page.addInitScript(() => {
    try { localStorage.setItem('riyadhFlowOnboarded', '1') } catch { /* noop */ }
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: /riyadhflow/i })).toBeVisible();

  await page.getByPlaceholder('Where from?').fill('King Saud University');
  await page.getByPlaceholder('Where to?').fill('National Museum');
  await page.getByRole('button', { name: /save/i }).click();

  await expect(page.getByText(/saved trips/i)).toBeVisible();
  await expect(page.getByText(/King Saud University/i)).toBeVisible();

  await page.getByRole('button', { name: /filter places by restaurants/i }).click();
  await expect(page).toHaveURL(/category=Restaurants/);

  await page.getByRole('button', { name: /filter places by all/i }).click();
  await expect(page).not.toHaveURL(/category=/);
});
