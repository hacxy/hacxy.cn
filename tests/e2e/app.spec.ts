import { expect, test } from '@playwright/test'

test('homepage shows site name and the fixture post', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Hacxy' })).toBeVisible()
  await expect(page.getByText('你好，世界')).toBeVisible()
  await expect(page.getByText('2026-08-10')).toBeVisible()
})

test('nav switches between posts list and about page', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: '关于' }).click()
  await expect(page).toHaveURL(/\/about/)
  await expect(page.getByRole('heading', { name: '关于' })).toBeVisible()

  await page.getByRole('link', { name: '文章' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Hacxy' })).toBeVisible()
})

test('unknown path renders 404', async ({ page }) => {
  await page.goto('/definitely-not-a-page')

  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
})

test('raw HTML source contains article title without executing JS', async ({ request }) => {
  const response = await request.get('/')
  const html = await response.text()

  // 预渲染成立的地基：爬虫不执行 JS 也能读到标题与正文（SEO 验收核心）
  expect(html).toContain('你好，世界')
  expect(html).toContain('Hacxy')
})
