import { test, expect } from '@playwright/test'

import { stubExternalApis } from './network-stub'

test.beforeEach(async ({ page }) => {
  await stubExternalApis(page)
})

test.describe('全路由冒烟', () => {
  test('首页渲染导航与正文区块', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Hacxy/)
    // 导航栏（exact 避免匹配「All posts →」）
    await expect(page.getByRole('link', { name: 'Posts', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'About', exact: true })).toBeVisible()
    // 首页文章区块
    await expect(page.getByText('Recent Posts')).toBeVisible()
    await expect(page.getByText('Contributions', { exact: true })).toBeVisible()
  })

  test('/posts 列表页展示文章链接', async ({ page }) => {
    await page.goto('/posts')
    // 真实 content 渲染的文章链接（懒加载后出现）
    const articleLink = page.locator("main a[href^='/github-weekly/']").first()
    await expect(articleLink).toBeVisible({ timeout: 10_000 })
  })

  test('/about 页面渲染作者信息', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('/skills 页面渲染技能卡片', async ({ page }) => {
    await page.goto('/skills')
    // mock 数据中的技能名出现（按钮内文本）
    await expect(page.getByRole('button', { name: /grilling/ }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('/tags 页面可用', async ({ page }) => {
    await page.goto('/tags')
    // 页面不崩溃即可（标签聚合自真实 content）
    await expect(page.locator('body')).toBeVisible()
  })

  test('未知路由展示文章未找到提示', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    await expect(page.getByText('Post not found.')).toBeVisible({ timeout: 10_000 })
  })
})
