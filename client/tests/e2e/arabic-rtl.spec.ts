import { expect, test } from '@playwright/test'

test('switching to Arabic flips the document to RTL and renders Arabic UI strings', async ({ page }) => {
  // Pre-seed the locale so the app boots straight into Arabic — avoids racing
  // the language toggle button against initial hydration.
  await page.addInitScript(() => {
    try { localStorage.setItem('riyadhFlowLocale', 'ar') } catch { /* noop */ }
  })

  await page.goto('/')

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')

  // App title is unchanged ("RiyadhFlow 🚗") but at least one localised string
  // should appear once Arabic messages are loaded. "الاتجاهات" = "Directions".
  await expect(page.getByText('الاتجاهات').first()).toBeVisible()
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
