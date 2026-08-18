import { test, expect } from '@playwright/test'

import { stubExternalApis } from './network-stub'

test.beforeEach(async ({ page }) => {
  await stubExternalApis(page)
})

test.describe('文章阅读主链路', () => {
  // 真实 content 中固定存在的文章（详情页验证用）
  const POST_SLUG = '/claude/01-what-is-claude-code'
  // /posts 首页列表中最新的文章（点击链路验证用）
  const FIRST_PAGE_SLUG = '/github-weekly/2026-w27'

  test('从 /posts 打开文章详情', async ({ page }) => {
    await page.goto('/posts')
    const articleLink = page.locator(`main a[href="${FIRST_PAGE_SLUG}"]`).first()
    await expect(articleLink).toBeVisible({ timeout: 10_000 })
    await articleLink.click()
    await page.waitForURL(`**${FIRST_PAGE_SLUG}`)
    // markdown 正文渲染为标题
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('文章页存在目录 TOC 且锚点指向正文标题', async ({ page }) => {
    await page.goto(POST_SLUG)
    // TOC 列表链接为 # 锚点
    const tocLink = page.locator("aside a[href^='#']").first()
    await expect(tocLink).toBeVisible({ timeout: 10_000 })
    const href = await tocLink.getAttribute('href')
    expect(href).toMatch(/^#/)
    await expect(page.locator(`[id="${href?.slice(1)}"]`)).toBeAttached()
  })

  test('正文渲染 markdown 标题与代码高亮', async ({ page }) => {
    await page.goto(POST_SLUG)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 })
    // h2..h4 小标题由 markdown 生成
    await expect(page.locator('main h2').first()).toBeVisible()
    // shiki 高亮的代码行（code > span 结构）
    await expect(page.locator('pre code span').first()).toBeVisible({ timeout: 15_000 })
  })

  test('主题切换按钮更新 data-theme', async ({ page }) => {
    await page.goto('/')
    const html = page.locator('html')
    const initial = (await html.getAttribute('data-theme')) ?? 'light'
    const toggle = page.getByRole('button', { name: /切换/ })
    await toggle.click()
    await expect(html).toHaveAttribute('data-theme', initial === 'dark' ? 'light' : 'dark')
  })
})
