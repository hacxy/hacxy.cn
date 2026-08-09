import { expect, test } from '@playwright/test'

test('renders the landing page', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'React + Vite + TypeScript' })).toBeVisible()
  await expect(page.getByText('Powered by @hacxy/kick')).toBeVisible()
})

test('counter increments on click', async ({ page }) => {
  await page.goto('/')

  const counterButton = page.getByRole('button', { name: /^Count is \d+$/ })
  await expect(counterButton).toHaveText('Count is 0')

  await counterButton.click()
  await expect(counterButton).toHaveText('Count is 1')

  await counterButton.click()
  await counterButton.click()
  await expect(counterButton).toHaveText('Count is 3')
})
