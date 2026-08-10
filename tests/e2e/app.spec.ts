import { expect, test } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

// gray-matter 无类型声明：E2E 仅用它解析 frontmatter 计算期望值（与构建期内容清单同一契约）
const require = createRequire(import.meta.url)
const matter = require('gray-matter') as (input: string) => {
  data: { draft?: boolean; tags?: string[] }
}

test('hero: big h1 site name + terminal window with all command outputs', async ({ page }) => {
  await page.goto('/')

  // 大号站点名作为 h1（既有 E2E 对 h1 的断言保留）
  const heading = page.getByRole('heading', { level: 1, name: 'Hacxy' })
  await expect(heading).toBeVisible()

  // 终端窗口可见
  const terminal = page.locator('.hero-terminal')
  await expect(terminal).toBeVisible()

  // 每条命令带 $ 提示符：whoami / cat tagline.txt / ls posts / npm run build / git clone
  // （5 条命令 + 1 个空闲提示符）
  await expect(terminal.locator('.terminal-prompt')).toHaveCount(6)
  for (const command of ['whoami', 'cat tagline.txt', 'ls posts', 'npm run build', 'git clone']) {
    await expect(terminal.getByText(command)).toBeVisible()
  }

  // whoami 输出：自我介绍（沿用站点信息）
  await expect(terminal.getByText(/前端工程师/)).toBeVisible()
  // tagline 全文最终可见（打字机结束态，不做时序断言）
  await expect(terminal.getByText('了解真相，才能获得真正的自由')).toBeVisible()
  // npm run build 成功输出
  await expect(terminal.getByText(/构建成功/)).toBeVisible()
  // git clone：真实指向 GitHub 的链接
  const cloneLink = terminal.getByRole('link', { name: 'https://github.com/hacxy' })
  await expect(cloneLink).toBeVisible()
  await expect(cloneLink).toHaveAttribute('href', 'https://github.com/hacxy')
})

test('hero terminal: ls posts counts match the content manifest', async ({ page }) => {
  // 期望值从内容源计算（同一契约：非 draft 文章数 + 全站标签并集），
  // 与构建期内容清单的 draft 过滤 / tags 聚合规则一致——新增文章无需改代码
  const postsDir = new URL('../../content/posts/', import.meta.url)
  const published = readdirSync(postsDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => matter(readFileSync(new URL(file, postsDir), 'utf8')))
    .filter((parsed) => !parsed.data.draft)
  const postCount = published.length
  const tagCount = new Set(published.flatMap((parsed) => parsed.data.tags ?? [])).size

  await page.goto('/')
  const terminal = page.locator('.hero-terminal')
  // 输出形如「3 篇文章 · 4 个标签」（文章数/标签数自动计算）
  await expect(terminal.getByText(new RegExp(`${postCount} 篇文章`))).toBeVisible()
  await expect(terminal.getByText(new RegExp(`${tagCount} 个标签`))).toBeVisible()
})

test('prerendered HTML contains hero terminal text and site name (SEO no regression)', async ({
  request,
}) => {
  const html = await (await request.get('/')).text()

  // 站点名 h1 + tagline 全文 + 各命令/输出都在预渲染源码中（爬虫不执行 JS 即可见）
  expect(html).toContain('Hacxy')
  expect(html).toContain('了解真相，才能获得真正的自由')
  expect(html).toContain('whoami')
  expect(html).toContain('cat tagline.txt')
  expect(html).toContain('ls posts')
  expect(html).toContain('npm run build')
  expect(html).toContain('git clone')
  expect(html).toContain('https://github.com/hacxy')
  expect(html).toContain('前端工程师')
})

test('hero terminal: reduced-motion skips typewriter, full text visible, no animation errors', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (err) => pageErrors.push(err.message))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  // 完整 tagline 直接显示（无需等待打字机）
  const tagline = page.getByText('了解真相，才能获得真正的自由')
  await expect(tagline).toBeVisible()
  // 打字机与 hero 入场动画都被禁用（纯 CSS 动画，reduce 下 animation: none）
  expect(await tagline.evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
  expect(
    await page.locator('.hero-enter').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none')
  // 全程无动画/脚本报错
  expect(pageErrors).toHaveLength(0)
})

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

test('geek-style design: mono fonts for name/date, green accent for links and active nav', async ({
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

  // 链接为 GitHub 绿强调色（亮色 #1a7f37）
  const linkColor = await page
    .getByRole('link', { name: '你好，世界' })
    .evaluate((el) => getComputedStyle(el).color)
  expect(linkColor).toBe('rgb(26, 127, 55)')

  // 当前导航高亮为绿色（SPA 导航下 className 更新晚于 URL，用自动重试断言等待）
  await page.getByRole('link', { name: '关于' }).click()
  await expect(page).toHaveURL(/\/about/)
  const aboutNav = page.getByRole('link', { name: '关于' })
  await expect(aboutNav).toHaveClass(/text-accent/)
  const activeNavColor = await aboutNav.evaluate((el) => getComputedStyle(el).color)
  expect(activeNavColor).toBe('rgb(26, 127, 55)')

  // 暗色切换后强调色随之更新（暗色 #3fb950，沿用 dark mode toggle 机制）
  await page.getByRole('button', { name: '切换暗色模式' }).click()
  const darkNavColor = await aboutNav.evaluate((el) => getComputedStyle(el).color)
  expect(darkNavColor).toBe('rgb(63, 185, 80)')
  const darkLinkColor = await page
    .getByRole('main')
    .getByRole('link', { name: 'GitHub' })
    .evaluate((el) => getComputedStyle(el).color)
  expect(darkLinkColor).toBe('rgb(63, 185, 80)')
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
  // 背景纹理图层在移动端同样存在（fixed 垫底，不产生横向滚动）
  await expect(page.locator('.bg-texture')).toHaveCount(1)
  // 首页点阵 canvas 在移动端同样存在（同一垫底模式，不产生横向滚动）
  await expect(page.locator('canvas.bg-dots')).toHaveCount(1)
  // hero 终端在移动端可见（375px 视口下无横向滚动）
  await expect(page.locator('.hero-terminal')).toBeVisible()
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

test('dots canvas: DPR capped at 2 and no horizontal overflow on mobile', async ({ browser }) => {
  // 375px 移动端 + 高分屏（deviceScaleFactor 3）：验证 DPR≤2 与无横向溢出
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 3,
  })
  const page = await context.newPage()
  await page.goto('/')

  const canvas = page.locator('canvas.bg-dots')
  await expect(canvas).toHaveCount(1)

  // 高分屏环境下 devicePixelRatio 确为 3（保证 DPR 上限断言有意义）
  expect(await page.evaluate(() => window.devicePixelRatio)).toBe(3)

  // 背板尺寸受 DPR≤2 约束：canvas.width ≤ clientWidth * 2（+1 容忍取整）
  const backing = await canvas.evaluate((el) => {
    const c = el as HTMLCanvasElement
    return { width: c.width, height: c.height, cssWidth: c.clientWidth, cssHeight: c.clientHeight }
  })
  expect(backing.width).toBeLessThanOrEqual(backing.cssWidth * 2 + 1)
  expect(backing.height).toBeLessThanOrEqual(backing.cssHeight * 2 + 1)

  // 移动端无横向溢出（点阵 canvas 不造成横向滚动）
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)

  await context.close()
})

test('dots animation is skipped under prefers-reduced-motion: page renders, no canvas, no errors', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (err) => pageErrors.push(err.message))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  // 页面正常渲染（无动画依赖）
  await expect(page.getByRole('heading', { name: 'Hacxy' })).toBeVisible()
  await expect(page.getByText('你好，世界')).toBeVisible()

  // prefers-reduced-motion：完全不渲染 canvas（无结构、无报错）
  await expect(page.locator('canvas.bg-dots')).toHaveCount(0)
  expect(pageErrors).toHaveLength(0)
})

test('dots adapt to theme: light dark-gray, dark green-tinted', async ({ page }) => {
  await page.goto('/')
  const canvas = page.locator('canvas.bg-dots')
  await expect(canvas).toHaveCount(1)

  // 归一化到亮色，断言亮色深灰（初始主题由环境决定，先切到已知状态）
  const html = page.locator('html')
  if (((await html.getAttribute('class')) ?? '').includes('dark')) {
    await page.getByRole('button', { name: '切换暗色模式' }).click()
  }
  await expect(canvas).toHaveAttribute('data-dots-color', '#1f2328')

  // 切到暗色：点阵颜色变为绿调
  await page.getByRole('button', { name: '切换暗色模式' }).click()
  await expect(canvas).toHaveAttribute('data-dots-color', '#3fb950')
})

test('dots animation pauses when tab hidden and resumes when visible', async ({ page }) => {
  await page.goto('/')
  const canvas = page.locator('canvas.bg-dots')
  await expect(canvas).toHaveCount(1)
  await expect(canvas).toHaveAttribute('data-animation-state', 'running')

  // 模拟切到后台：visibilityState 置 hidden 并派发 visibilitychange → 动画暂停
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(canvas).toHaveAttribute('data-animation-state', 'paused')

  // 回到前台：恢复动画
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(canvas).toHaveAttribute('data-animation-state', 'running')
})

test('dots animation is pure canvas 2D: no pixi/simplex-noise runtime dependencies', async () => {
  // 验收：页面无 PixiJS / simplex-noise 等新运行时依赖（package.json 不新增依赖）
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  expect(deps['pixi.js']).toBeUndefined()
  expect(deps['pixi']).toBeUndefined()
  expect(deps['simplex-noise']).toBeUndefined()
})

test('about page shows bio, social links and contact info', async ({ page }) => {
  await page.goto('/about')

  // 简介
  await expect(page.getByText(/前端工程师/)).toBeVisible()
  // 社交链接（外链）——限定 main，避免与导航新增的 GitHub 图标链接混淆
  const github = page.getByRole('main').getByRole('link', { name: 'GitHub' })
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

test('feed.xml is a valid RSS 2.0 feed with full article content', async ({ request }) => {
  const feed = await (await request.get('/feed.xml')).text()
  expect(feed).toContain('<rss version="2.0"')
  expect(feed).toContain('<channel>')
  expect(feed).toContain('<language>zh-CN</language>')
  expect(feed).toContain('<title>Hacxy</title>')

  // 条目含正确标题 / 链接 / 日期（RFC 2822）
  expect(feed).toContain('<title>用 React + Vite 搭一个构建期预渲染的静态博客</title>')
  expect(feed).toContain('<link>https://hacxy.cn/posts/prerendered-blog-with-vite</link>')
  expect(feed).toContain('<pubDate>Tue, 11 Aug 2026 00:00:00 +0000</pubDate>')
  expect(feed).toContain('<guid isPermaLink="true">https://hacxy.cn/posts/hello-world</guid>')

  // 全文在 content:encoded（CDATA）
  expect(feed).toContain('<content:encoded>')
  expect(feed).toContain('构建期一次性完成渲染')

  // draft 文章不在 feed
  expect(feed).not.toContain('draft-post')
})

test('favicon.svg is green-themed and consistent with the site theme', async ({ request }) => {
  const favicon = await (await request.get('/favicon.svg')).text()
  // 主色为 GitHub 绿（暗色强调 #3fb950），无残留紫色系
  expect(favicon).toContain('#3fb950')
  expect(favicon).not.toContain('#863bff')
  expect(favicon).not.toContain('#7e14ff')
})

test('full-site background texture layer is fixed and never blocks interaction', async ({
  page,
}) => {
  await page.goto('/')
  const layer = page.locator('.bg-texture')
  await expect(layer).toHaveCount(1)

  // 垫底图层：固定定位、不拦截指针事件（低干扰背景纹理的基本契约）
  expect(await layer.evaluate((el) => getComputedStyle(el).position)).toBe('fixed')
  expect(await layer.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')

  // 不拦截指针事件：图层覆盖区域内的链接仍可点击（行为断言）
  await page.getByRole('link', { name: '你好，世界' }).click()
  await expect(page).toHaveURL(/\/posts\/hello-world/)

  // 文章页同样存在背景图层
  await expect(page.locator('.bg-texture')).toHaveCount(1)
  expect(await page.locator('.bg-texture').evaluate((el) => getComputedStyle(el).position)).toBe(
    'fixed',
  )
})

test('background texture is an inline SVG data-URI (grid + code chars), zero external requests', async ({
  page,
  request,
}) => {
  // 纹理来自样式表内的内联 SVG data-URI（复用自托管断言思路：从 HTML 取 CSS 入口再读内容）
  const html = await (await request.get('/')).text()
  const cssHref = html.match(/href="([^"]+\.css)"/)?.[1]
  expect(cssHref).toBeTruthy()
  const css = await (await request.get(cssHref as string)).text()

  const uris = css.match(/data:image\/svg\+xml,[^")]+/g) ?? []
  expect(uris.length).toBeGreaterThanOrEqual(1)

  // 解码后确认是「细网格 + 十六进制/代码字符」纹理，而非纯色占位
  const decoded = uris.map((uri) => decodeURIComponent(uri)).join('')
  expect(decoded).toContain('<svg')
  expect(decoded).toContain('M24 0v120') // 网格线
  expect(decoded).toContain('0x')
  expect(decoded).toContain('{ }')
  expect(decoded).toContain('=>')

  // 页面加载不发任何外部资源请求（纹理为零成本内联，无外部图片）
  const external: string[] = []
  page.on('request', (req) => {
    const url = new URL(req.url())
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') external.push(req.url())
  })
  await page.goto('/posts/prerendered-blog-with-vite')
  expect(external).toHaveLength(0)
})

test('background texture adapts to theme: light dark-gray, dark green-tinted', async ({
  page,
  request,
}) => {
  // 亮暗两套变体的颜色（data-URI 中 # 编码为 %23）：亮色深灰 #1f2328、暗色绿调 #3fb950
  const html = await (await request.get('/')).text()
  const cssHref = html.match(/href="([^"]+\.css)"/)?.[1]
  expect(cssHref).toBeTruthy()
  const css = await (await request.get(cssHref as string)).text()
  expect(css).toContain('%231f2328')
  expect(css).toContain('%233fb950')

  // 切换主题后纹理 background-image 随之更新（沿用 dark mode toggle 模式，不依赖初始主题）
  await page.goto('/')
  const layer = page.locator('.bg-texture')
  const lightBg = await layer.evaluate((el) => getComputedStyle(el).backgroundImage)
  await page.getByRole('button', { name: '切换暗色模式' }).click()
  const darkBg = await layer.evaluate((el) => getComputedStyle(el).backgroundImage)
  expect(darkBg).not.toBe(lightBg)
})

test('geek-style OG images are generated and referenced', async ({ request }) => {
  // 文章页 og:image 指向构建期生成的模板图
  const post = await (await request.get('/posts/prerendered-blog-with-vite')).text()
  expect(post).toContain(
    'property="og:image" content="https://hacxy.cn/og/posts/prerendered-blog-with-vite.svg"',
  )

  const og = await (await request.get('/og/posts/prerendered-blog-with-vite.svg')).text()
  expect(og).toContain('<svg')
  expect(og).toContain('width="1200" height="630"')
  // 模板要素：绿色系底（暗色基调 + 绿强调）+ 等宽字体 + 文章标题（标题可能折行，剥离标签后断言全文）
  expect(og).toContain('3fb950')
  expect(og).not.toContain('a371f7')
  expect(og).toContain('JetBrains Mono')
  const ogText = og
    .replace(/<\/text>\s*<text[^>]*>/g, '') // 折行标题的相邻 <text> 合并
    .replace(/<[^>]+>/g, '')
  expect(ogText).toContain('用 React + Vite 搭一个构建期预渲染的静态博客')

  // 首页 og:image 同样存在
  const home = await (await request.get('/')).text()
  expect(home).toContain('property="og:image" content="https://hacxy.cn/og/home.svg"')
  const homeOg = await (await request.get('/og/home.svg')).text()
  expect(homeOg).toContain('Hacxy')
})

test('nav shows GitHub and RSS icon links with correct targets', async ({ page, request }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation')

  // GitHub 图标链接：外链新窗口打开（可聚焦链接 + aria-label，键盘无障碍）
  const github = nav.getByRole('link', { name: 'GitHub' })
  await expect(github).toBeVisible()
  await expect(github).toHaveAttribute('href', 'https://github.com/hacxy')
  await expect(github).toHaveAttribute('target', '_blank')
  await expect(github).toHaveAttribute('rel', /noopener/)

  // RSS 图标链接指向 /feed.xml，且该地址可访问（复用既有 feed 用例的构建产物）
  const rss = nav.getByRole('link', { name: 'RSS' })
  await expect(rss).toBeVisible()
  await expect(rss).toHaveAttribute('href', '/feed.xml')
  const feed = await request.get('/feed.xml')
  expect(feed.status()).toBe(200)

  // 预渲染 HTML 同样包含两个图标链接（爬虫不执行 JS 即可见，SEO 不回归）
  const home = await (await request.get('/')).text()
  expect(home).toContain('href="https://github.com/hacxy"')
  expect(home).toContain('icons.svg#github-icon')
  expect(home).toContain('icons.svg#rss-icon')
})

test('nav structure keeps posts | about + theme toggle + icons', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation')

  // 既有入口不受打扰：文章 | 关于 + 主题切换 + 图标（PRD 用户故事 26）
  await expect(nav.getByRole('link', { name: '文章' })).toBeVisible()
  await expect(nav.getByRole('link', { name: '关于' })).toBeVisible()
  await expect(nav.getByRole('button', { name: '切换暗色模式' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'GitHub' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'RSS' })).toBeVisible()
})

test('nav icon links are keyboard focusable', async ({ page }) => {
  await page.goto('/')

  // Tab 顺序：文章 → 关于 → 主题切换 → GitHub → RSS（键盘无障碍验收，PRD 用户故事 33）
  // 限定 navigation：避免与 hero 终端内 git clone 链接（名字含 github）歧义（strict mode）
  const nav = page.getByRole('navigation')
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab')
  await expect(nav.getByRole('link', { name: 'GitHub' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(nav.getByRole('link', { name: 'RSS' })).toBeFocused()
})

test('homepage renders dots canvas: fixed layer that never blocks interaction, homepage-only', async ({
  page,
  request,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (err) => pageErrors.push(err.message))

  // 水合安全：SSR 预渲染 HTML 不输出 canvas 结构（仅客户端挂载，杜绝 hydration mismatch）
  const html = await (await request.get('/')).text()
  expect(html).not.toContain('<canvas')

  await page.goto('/')
  const canvas = page.locator('canvas.bg-dots')
  await expect(canvas).toHaveCount(1)

  // 垫底契约：fixed 铺满视口 + 不拦截指针事件（同背景纹理图层的模式）
  expect(await canvas.evaluate((el) => getComputedStyle(el).position)).toBe('fixed')
  expect(await canvas.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')

  // 不拦截交互：画布覆盖区域内的链接仍可点击（行为断言）
  await page.getByRole('link', { name: '你好，世界' }).click()
  await expect(page).toHaveURL(/\/posts\/hello-world/)

  // 仅首页挂载：SPA 导航到文章页后点阵 canvas 移除
  await expect(page.locator('canvas.bg-dots')).toHaveCount(0)

  // 动画全程无报错
  expect(pageErrors).toHaveLength(0)
})
