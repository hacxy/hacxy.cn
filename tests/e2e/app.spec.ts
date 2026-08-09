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
  // 最新文章（真实技术文章）无上一篇，下一篇指向 hello-world
  await page.goto('/posts/prerendered-blog-with-vite')
  await expect(page.getByRole('link', { name: /上一篇/ })).toHaveCount(0)
  await page.getByRole('link', { name: /下一篇/ }).click()
  await expect(page).toHaveURL(/\/posts\/hello-world/)

  // hello-world 位于中间：上一篇 = 最新文章，下一篇 = second-post
  await expect(page.getByRole('link', { name: /上一篇/ })).toBeVisible()
  await page.getByRole('link', { name: /下一篇/ }).click()
  await expect(page).toHaveURL(/\/posts\/second-post/)

  // 最旧文章（second-post）只有上一篇，没有下一篇
  await expect(page.getByRole('link', { name: /上一篇/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /下一篇/ })).toHaveCount(0)
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

test('real article renders full flow: body, code, table and image in raw HTML', async ({
  request,
}) => {
  const response = await request.get('/posts/prerendered-blog-with-vite')
  expect(response.status()).toBe(200)
  const html = await response.text()

  // 正文文本直接进源码（爬虫无需执行 JS）
  expect(html).toContain('用 React + Vite 搭一个构建期预渲染的静态博客')
  expect(html).toContain('构建期一次性完成渲染')
  // 代码高亮结构（Shiki 双主题）
  expect(html).toContain('shiki-themes')
  expect(html).toContain('--shiki-dark')
  // GFM 表格
  expect(html).toContain('<table>')
  // 图片引用重写为绝对路径，且文件在产物中可访问
  expect(html).toContain('src="/assets/architecture.svg"')
  const image = await request.get('/assets/architecture.svg')
  expect(image.status()).toBe(200)
  // 目录（h2/h3 锚点，github-slugger 会剔除全角冒号）
  expect(html).toContain('href="#渲染策略构建期一次性渲染"')
})

test('dark mode toggles via button and persists after reload', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')
  const initialDark = ((await html.getAttribute('class')) ?? '').includes('dark')

  await page.getByRole('button', { name: '切换暗色模式' }).click()
  const afterDark = ((await html.getAttribute('class')) ?? '').includes('dark')
  expect(afterDark).not.toBe(initialDark)

  // 刷新后偏好保持（inline 防闪烁脚本在首帧前读 localStorage 恢复 .dark）
  await page.reload()
  const persistedDark = ((await html.getAttribute('class')) ?? '').includes('dark')
  expect(persistedDark).toBe(afterDark)
})

test('prerendered HTML ships the inline no-flash theme script', async ({ request }) => {
  const html = await (await request.get('/')).text()

  // 防闪烁脚本：首帧渲染前按 localStorage 偏好 / 系统偏好设置 .dark
  expect(html).toContain('localStorage.getItem')
  expect(html).toContain('prefers-color-scheme')
})

test('geek-style design: mono fonts for name/date, purple accent for links and active nav', async ({
  page,
}) => {
  await page.goto('/')

  // 站点名与日期元数据使用等宽字体（JetBrains Mono 自托管）
  const nameFont = await page
    .getByRole('heading', { name: 'Hacxy' })
    .evaluate((el) => getComputedStyle(el).fontFamily)
  expect(nameFont).toContain('JetBrains Mono')

  const dateFont = await page
    .getByText('2026-08-11')
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily)
  expect(dateFont).toContain('JetBrains Mono')

  // 链接为紫色强调色（#8250df）
  const linkColor = await page
    .getByRole('link', { name: '你好，世界' })
    .evaluate((el) => getComputedStyle(el).color)
  expect(linkColor).toBe('rgb(130, 80, 223)')

  // 当前导航高亮为紫色（SPA 导航下 className 更新晚于 URL，用自动重试断言等待）
  await page.getByRole('link', { name: '关于' }).click()
  await expect(page).toHaveURL(/\/about/)
  const aboutNav = page.getByRole('link', { name: '关于' })
  await expect(aboutNav).toHaveClass(/text-accent/)
  const activeNavColor = await aboutNav.evaluate((el) => getComputedStyle(el).color)
  expect(activeNavColor).toBe('rgb(130, 80, 223)')
})

test('fonts are self-hosted: woff2 on same origin, no external font requests', async ({
  page,
  request,
}) => {
  // @font-face 在样式表里：从页面 HTML 找到 CSS 入口，断言其引用自托管字体
  const html = await (await request.get('/')).text()
  const cssHref = html.match(/href="([^"]+\.css)"/)?.[1]
  expect(cssHref).toBeTruthy()
  const css = await (await request.get(cssHref as string)).text()
  expect(css).toContain('/fonts/jetbrains-mono-latin-400-normal.woff2')
  expect(css).not.toContain('fonts.googleapis.com')

  // 页面加载不发起任何外部字体请求
  const external: string[] = []
  page.on('request', (req) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(req.url())) external.push(req.url())
  })
  await page.goto('/')
  expect(external).toHaveLength(0)

  // 字体文件真实可访问
  const font = await request.get('/fonts/jetbrains-mono-latin-400-normal.woff2')
  expect(font.status()).toBe(200)
})

test('footer shows the CC BY-NC-SA 4.0 license', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('CC BY-NC-SA 4.0')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
})

test('layout has no horizontal overflow on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })

  await page.goto('/')
  const homeOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(homeOverflow).toBe(false)

  // 文章页含代码块与表格，最容易撑破小屏
  await page.goto('/posts/prerendered-blog-with-vite')
  const postOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(postOverflow).toBe(false)
})

test('about page shows bio, social links and contact info', async ({ page }) => {
  await page.goto('/about')

  // 简介
  await expect(page.getByText(/前端工程师/)).toBeVisible()
  // 社交链接（外链）
  const github = page.getByRole('link', { name: 'GitHub' })
  await expect(github).toBeVisible()
  await expect(github).toHaveAttribute('href', 'https://github.com/hacxy')
  // 联系方式
  const mail = page.getByRole('link', { name: 'hello@hacxy.cn' })
  await expect(mail).toBeVisible()
  await expect(mail).toHaveAttribute('href', 'mailto:hello@hacxy.cn')
})

test('every page ships OG/meta/canonical; posts ship JSON-LD Article', async ({ request }) => {
  const home = await (await request.get('/')).text()
  expect(home).toContain('rel="canonical" href="https://hacxy.cn/"')
  expect(home).toContain('property="og:title"')
  expect(home).toContain('name="description"')

  const about = await (await request.get('/about')).text()
  expect(about).toContain('rel="canonical" href="https://hacxy.cn/about"')
  expect(about).toContain('<title>关于 · Hacxy</title>')

  const post = await (await request.get('/posts/prerendered-blog-with-vite')).text()
  expect(post).toContain(
    'property="og:title" content="用 React + Vite 搭一个构建期预渲染的静态博客 · Hacxy"',
  )
  expect(post).toContain('rel="canonical" href="https://hacxy.cn/posts/prerendered-blog-with-vite"')
  // JSON-LD Article 结构化数据
  expect(post).toContain('application/ld+json')
  expect(post).toContain('"@type": "Article"')
  expect(post).toContain('"datePublished": "2026-08-11"')
  expect(post).toContain('"dateModified": "2026-08-12"')
  expect(post).toContain('"headline": "用 React + Vite 搭一个构建期预渲染的静态博客"')
})

test('sitemap.xml and robots.txt exist with correct structure', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).toContain('<urlset')
  expect(sitemap).toContain('<loc>https://hacxy.cn/</loc>')
  expect(sitemap).toContain('<loc>https://hacxy.cn/about</loc>')
  expect(sitemap).toContain('<loc>https://hacxy.cn/posts/hello-world</loc>')
  expect(sitemap).toContain('<loc>https://hacxy.cn/posts/prerendered-blog-with-vite</loc>')
  // draft 文章不在 sitemap
  expect(sitemap).not.toContain('draft-post')

  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('User-agent: *')
  expect(robots).toContain('Sitemap: https://hacxy.cn/sitemap.xml')
})
