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

test('direct access to a post returns prerendered HTML containing body text', async ({
  request,
}) => {
  const response = await request.get('/posts/hello-world')
  expect(response.status()).toBe(200)
  const html = await response.text()

  // 直达永久链接返回 200，且源码含正文文本（预渲染成立、SEO 成立的核心验收）
  expect(html).toContain('这是 hacxy.cn 重建后的第一篇文章')
})

test('post page prerendered HTML contains shiki code highlight structure', async ({ request }) => {
  const response = await request.get('/posts/hello-world')
  const html = await response.text()

  // 代码高亮在构建期完成：HTML 源码含 shiki 结构与双主题标记，爬虫无需执行 JS
  expect(html).toContain('class="shiki')
  expect(html).toContain('--shiki-dark')
  expect(html).toContain('language-ts')
})

test('post page renders title, date and body content', async ({ page }) => {
  await page.goto('/posts/hello-world')

  await expect(page.getByRole('heading', { name: '你好，世界' })).toBeVisible()
  await expect(page.getByText('2026-08-10')).toBeVisible()
  await expect(page.getByText('这是 hacxy.cn 重建后的第一篇文章')).toBeVisible()
})

test('clicking a post on the homepage opens the post page', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: '你好，世界' }).click()
  await expect(page).toHaveURL(/\/posts\/hello-world/)
  await expect(page.getByRole('heading', { name: '你好，世界' })).toBeVisible()
})
