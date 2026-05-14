import { expect, test } from '@playwright/test'

test('saved trips persist to localStorage and survive reload', async ({ page }) => {
  await page.goto('/')

  await page.getByPlaceholder('Where from?').fill('Office')
  await page.getByPlaceholder('Where to?').fill('Home')
  await page.getByRole('button', { name: /save/i }).click()

  await expect(page.getByText(/saved trips/i)).toBeVisible()
  await expect(page.getByText(/Office/i)).toBeVisible()
  await expect(page.getByText(/Home/i)).toBeVisible()

  await page.reload()

  await expect(page.getByText(/saved trips/i)).toBeVisible()
  await expect(page.getByText(/Office/i)).toBeVisible()
  await expect(page.getByText(/Home/i)).toBeVisible()
})

test('PWA manifest is reachable and has the expected app metadata', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest')
  expect(res.ok()).toBe(true)
  const body = await res.json()
  expect(body.name).toBe('RiyadhFlow')
  expect(body.display).toBe('standalone')
  expect(body.theme_color).toBe('#10b981')
  expect(Array.isArray(body.icons)).toBe(true)
  expect(body.icons.length).toBeGreaterThan(0)
})

test('offline route renders the offline shell', async ({ page }) => {
  await page.goto('/offline')
  await expect(page.getByRole('heading', { name: /offline/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /retry/i })).toBeVisible()
})
