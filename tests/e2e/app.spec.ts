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

test('post page shows TOC with working anchors', async ({ page }) => {
  await page.goto('/posts/hello-world')

  const toc = page.getByRole('navigation', { name: '文章目录' })
  await expect(toc).toBeVisible()
  await expect(toc.getByRole('link', { name: '接下来' })).toBeVisible()

  await toc.getByRole('link', { name: '接下来' }).click()
  // 锚点跳转：URL hash 指向目标标题（CJK 在 location.hash 中为百分号编码）
  await expect.poll(() => page.evaluate(() => decodeURIComponent(location.hash))).toBe('#接下来')
})

test('prev/next navigation moves between posts', async ({ page }) => {
  // 列表按日期倒序：hello-world（最新）无上一篇，下一篇指向 second-post
  await page.goto('/posts/hello-world')
  await expect(page.getByRole('link', { name: /下一篇/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /上一篇/ })).toHaveCount(0)

  await page.getByRole('link', { name: /下一篇/ }).click()
  await expect(page).toHaveURL(/\/posts\/second-post/)
  await expect(page.getByRole('heading', { name: '第二篇文章' })).toBeVisible()

  // second-post 的上一篇指回 hello-world，且无下一篇
  await expect(page.getByRole('link', { name: /上一篇/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /下一篇/ })).toHaveCount(0)

  await page.getByRole('link', { name: /上一篇/ }).click()
  await expect(page).toHaveURL(/\/posts\/hello-world/)
  await expect(page.getByRole('heading', { name: '你好，世界' })).toBeVisible()
})

test('draft posts are excluded from the build output', async ({ request }) => {
  // 首页列表与内容清单不含 draft 文章
  const homeHtml = await (await request.get('/')).text()
  expect(homeHtml).not.toContain('草稿中的文章')

  // draft 文章不参与预渲染：直接访问回落 SPA 404，正文文本不出现在源码中
  const draftHtml = await (await request.get('/posts/draft-post')).text()
  expect(draftHtml).not.toContain('草稿正文')
})

test('post images in assets/ are copied to the build and accessible', async ({ request }) => {
  // 文章 HTML 中 assets/ 引用被重写为站点绝对路径
  const html = await (await request.get('/posts/hello-world')).text()
  expect(html).toContain('/assets/fixture.png')

  // 图片文件在构建产物中真实存在且可访问
  const image = await request.get('/assets/fixture.png')
  expect(image.status()).toBe(200)
})
