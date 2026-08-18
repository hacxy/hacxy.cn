import type { Page } from '@playwright/test'

/**
 * 拦截所有外部 API 请求，保证 e2e 确定性（不依赖真网络与限流）。
 */
export async function stubExternalApis(page: Page) {
  await page.route(/api\.github\.com\//, (route) => {
    const url = route.request().url()
    if (url.includes('/users/hacxy'))
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ public_repos: 12, public_gists: 3, followers: 99, following: 10 }),
      })
    if (url.includes('/repos'))
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          { name: 'l2d-widget', stargazers_count: 1200 },
          { name: 'hacxy.cn', stargazers_count: 88 },
        ]),
      })
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
  })

  await page.route(/github-contributions-api\./, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        total: { '2026': 100 },
        contributions: Array.from({ length: 20 }, (_, i) => ({
          date: `2026-06-${String((i % 28) + 1).padStart(2, '0')}`,
          count: i % 5,
          level: (i % 5) as 0 | 1 | 2 | 3 | 4,
        })),
      }),
    }),
  )

  await page.route(/profile\.hacxy\.cn\//, (route) => {
    const url = route.request().url()
    if (url.includes('/skills'))
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          { name: 'grilling', description: '拷问用户的决策压力测试技能', files: ['SKILL.md'] },
        ]),
      })
    if (url.includes('/file/'))
      return route.fulfill({
        contentType: 'text/plain',
        body: '---\nname: grilling\n---\n# 拷问技能\n\n用户决策前逐一施压。\n',
      })
    return route.fulfill({ status: 404, body: '{}' })
  })
}
