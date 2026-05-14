import { expect, test } from '@playwright/test'

test('switching to Arabic flips the document to RTL and renders Arabic UI strings', async ({ page }) => {
  await page.goto('/')

  // Click the language toggle (more representative than localStorage
  // pre-seeding, and avoids racing the cold-server hydration timeline).
  await page.getByRole('button', { name: /switch to arabic/i }).click()

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')

  // "نقطة الانطلاق" = "Starting point" — rendered as the visible label
  // on the Start input, so it's on screen at idle without needing to
  // select a place first.
  await expect(page.getByText('نقطة الانطلاق').first()).toBeVisible()
})

test('Arabic locale persists across reload', async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('riyadhFlowLocale', 'ar') } catch { /* noop */ }
  })

  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
})
