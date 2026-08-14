import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

import {
  expectedNeighbors,
  expectedDirectory,
  publishedPosts,
  treeVisiblePosts,
} from './posts-helper.ts'

test('hero: big h1 site name + AI agent conversation (three Q&A rounds)', async ({ page }) => {
  await page.goto('/')

  // 大号站点名作为 h1（既有 E2E 对 h1 的断言保留）
  const heading = page.getByRole('heading', { level: 1, name: 'Hacxy' })
  await expect(heading).toBeVisible()

  // pi 风格 AI 编码 agent 会话演出终端可见
  const terminal = page.locator('.hero-terminal')
  await expect(terminal).toBeVisible()

  // 三轮问答全部经输入框演出（issue #40）：问题既在输入框（逐字符打字的文本）
  // 也在 transcript（❓ 用户行，加粗 = 黑白下的第一视觉层级）
  for (const question of ['你是谁', '这个站有什么', '怎么联系']) {
    const typed = terminal.locator('.terminal-input-text').filter({ hasText: question })
    await expect(typed).toBeVisible()
    const q = terminal.locator('.user-question').filter({ hasText: question })
    await expect(q).toBeVisible()
    expect(await q.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('700')
  }

  // 每轮发送后：Thinking… → Done.（agent 状态行，三轮各一对）
  await expect(terminal.locator('.terminal-status--thinking')).toHaveCount(3)
  await expect(terminal.locator('.terminal-status--done')).toHaveCount(3)

  // assistant 回答：简介 + tagline（打字机结束态全文可见，不做时序断言）
  await expect(terminal.getByText(/前端工程师/)).toBeVisible()
  await expect(terminal.getByText('了解真相，才能获得真正的自由')).toBeVisible()

  // 怎么联系 → GitHub 外链：下划线 + 加粗（黑白下区分，与页面 chrome 一致）
  const githubLink = terminal.getByRole('link', { name: 'https://github.com/hacxy' })
  await expect(githubLink).toBeVisible()
  await expect(githubLink).toHaveAttribute('href', 'https://github.com/hacxy')
  expect(await githubLink.evaluate((el) => getComputedStyle(el).textDecorationLine)).toContain(
    'underline',
  )
  expect(await githubLink.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('700')
})

test('hero terminal: ls posts counts match the content manifest', async ({ page }) => {
  // 期望值从内容源计算（同一契约：非 draft 文章数 + 全站标签并集），
  // 与构建期内容清单的 draft 过滤 / tags 聚合规则一致——新增文章无需改代码
  const published = publishedPosts()
  const postCount = published.length
  const tagCount = new Set(published.flatMap((post) => post.tags)).size

  await page.goto('/')
  const terminal = page.locator('.hero-terminal')

  // 回答行输出形如「3 篇文章 · 4 个标签」（文章数/标签数自动计算）
  await expect(
    terminal.locator('.hero-line').filter({ hasText: new RegExp(`${postCount} 篇文章`) }),
  ).toBeVisible()

  // 状态栏（issue #40）：同一信息随 ● live 并入状态栏（构建期自动计算，data-* 供断言）
  const statsItem = terminal.locator('.hero-terminal-caption [data-posts]')
  await expect(statsItem).toBeVisible()
  await expect(statsItem).toHaveAttribute('data-posts', String(postCount))
  await expect(statsItem).toHaveAttribute('data-tags', String(tagCount))
  await expect(statsItem).toHaveText(new RegExp(`${postCount} 篇文章 · ${tagCount} 个标签`))
})

test('hero terminal: always black background with white text in light and dark themes', async ({
  page,
}) => {
  await page.goto('/')
  const html = page.locator('html')
  const terminal = page.locator('.hero-terminal')

  // 归一化到亮色：恒黑底白字（与页面 chrome 主题色解耦）
  if (((await html.getAttribute('class')) ?? '').includes('dark')) {
    await page.getByRole('button', { name: '切换暗色模式' }).click()
  }
  await expect(terminal).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  await expect(terminal).toHaveCSS('color', 'rgb(255, 255, 255)')

  // 暗色模式同样恒黑底白字（不随主题反色）
  await page.getByRole('button', { name: '切换暗色模式' }).click()
  await expect(terminal).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  await expect(terminal).toHaveCSS('color', 'rgb(255, 255, 255)')
})

test('hero terminal: transcript → divider (────) → input → status bar structure (issue #40)', async ({
  page,
}) => {
  await page.goto('/')
  const terminal = page.locator('.hero-terminal')

  // 四角括号：┌ ┐ └ ┘ 四个角装饰
  const corners = terminal.locator('.hero-terminal-corner')
  await expect(corners).toHaveCount(4)
  expect((await corners.allTextContents()).sort()).toEqual(['┌', '┐', '└', '┘'].sort())

  // 终端内部结构自上而下：会话 transcript → 分隔线（────）→ 输入区 → 状态栏
  const order = await page.evaluate(() => {
    const sels = [
      '.hero-terminal-body',
      '.terminal-divider',
      '.terminal-input-row',
      '.hero-terminal-caption',
    ]
    const nodes = sels.map((sel) => document.querySelector(sel))
    const follows = (a: Element, b: Element) =>
      !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    return [
      follows(nodes[0]!, nodes[1]!),
      follows(nodes[1]!, nodes[2]!),
      follows(nodes[2]!, nodes[3]!),
    ]
  })
  expect(order).toEqual([true, true, true])

  // 分隔线 = ────（box-drawing 字符，装饰性不进可访问性树）
  const divider = terminal.locator('.terminal-divider')
  await expect(divider).toBeVisible()
  await expect(divider).toHaveText('────')
  expect(await divider.getAttribute('aria-hidden')).toBe('true')

  // 输入区 = 输入框（演出用，非交互）：三轮问题各一个打字文本 + 停驻光标
  const input = terminal.locator('.terminal-input')
  await expect(input).toBeVisible()
  await expect(input.locator('.terminal-typed')).toHaveCount(3)
  await expect(input.locator('.terminal-input-cursor')).toHaveCount(1)

  // 底部 caption = 终端状态栏（issue #42 + #55 精简）：● live · 文章数·标签数 · v<版本>
  // （issue #55 移除 theme / git 段，只保留站点真实信息）
  const caption = terminal.locator('.hero-terminal-caption')
  await expect(caption).toBeVisible()
  await expect(caption.getByText('live', { exact: true })).toBeVisible()
  await expect(caption.getByText('AI 会话演出')).toHaveCount(0)
  await expect(caption.getByText('自动播放一遍后停驻')).toHaveCount(0)
  expect(await caption.evaluate((el) => getComputedStyle(el).fontFamily)).toContain(
    'JetBrains Mono',
  )

  // live 红点：红色系（灰阶之外的唯一彩色系，live 状态指示）
  const dot = caption.locator('.live-dot')
  await expect(dot).toBeVisible()
  expect(await dot.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(239, 68, 68)')

  // 状态段真实信息存在（内容由专门用例从源计算断言）：版本号（构建期注入）
  await expect(caption.locator('.status-item').filter({ hasText: /^v\d/ })).toBeVisible()

  // issue #55：theme 段与 git 段不再渲染（DOM 不存在——环境噪声段已从状态栏移除）
  await expect(caption.locator('[data-theme]')).toHaveCount(0)
  await expect(caption.locator('[data-git-branch]')).toHaveCount(0)
  await expect(caption.getByText(/^theme:/)).toHaveCount(0)
  await expect(caption.getByText(/^git:/)).toHaveCount(0)

  // 无 mac 装饰圆点窗口栏（issue #18 移除；文章卡片的 ●●● 标题栏不受影响）
  await expect(terminal.locator('.hero-terminal-bar')).toHaveCount(0)
})

test('status bar: site version injected from package.json at build time (issue #42)', async ({
  page,
  request,
}) => {
  // 期望值从内容源计算模式延续：版本号从 package.json 读取（构建期注入的同一来源）
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
    version: string
  }
  const expected = `v${pkg.version}`

  await page.goto('/')
  const versionItem = page
    .locator('.hero-terminal-caption .status-item')
    .filter({ hasText: expected })
  await expect(versionItem).toBeVisible()
  await expect(versionItem).toHaveAttribute('data-version', pkg.version)

  // 构建期注入 → 预渲染 HTML 已含版本（爬虫不执行 JS 可读，SEO 不回归）；
  // 注：React SSR 在混合静态文本与表达式的节点间插入 <!-- -->，先剥离再断言
  const html = (await (await request.get('/')).text()).replaceAll('<!-- -->', '')
  expect(html).toContain(expected)
})

test('prerendered HTML contains the full conversation text (SEO no regression)', async ({
  request,
}) => {
  // 站点名 h1 + 三轮问答全文（输入框打字文本 + transcript 问题行 + Thinking…/Done. +
  // 回答 + 分隔线 + 状态栏）都在预渲染源码中（爬虫不执行 JS 即可读）。注：React SSR
  // 会在混合静态文本与表达式的节点间插入 <!-- --> 注释（文本本身连续），先剥离再断言全文
  const html = (await (await request.get('/')).text()).replaceAll('<!-- -->', '')

  expect(html).toContain('Hacxy')
  // 三轮问题：transcript 用户行 + 输入框打字文本（输入框文本同样进预渲染 HTML）
  for (const q of ['你是谁', '这个站有什么', '怎么联系']) {
    expect(html).toContain(q)
  }
  // 每轮发送后的 agent 状态行：Thinking… → Done.
  expect(html).toContain('Thinking…')
  expect(html).toContain('Done.')
  // 回答全文
  expect(html).toContain('前端工程师')
  expect(html).toContain('了解真相，才能获得真正的自由')
  expect(html).toContain('https://github.com/hacxy')
  // 分隔线（────）
  expect(html).toContain('────')
  // 状态栏（issue #40 + #55）：live + 文章数·标签数 + 版本（issue #55 移除 theme/git 段）
  expect(html).toContain('live')
  expect(html).toContain('篇文章')
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
    version: string
  }
  expect(html).toContain(`v${pkg.version}`)
  // issue #55：theme / git 环境噪声段不在预渲染 HTML 中（DOM 不存在）
  expect(html).not.toContain('theme: ')
  expect(html).not.toContain('commits')
})

test('hero terminal: CSS show plays once and stops; live dot + parked cursor pulse infinitely', async ({
  page,
}) => {
  await page.goto('/')
  const terminal = page.locator('.hero-terminal')

  // 演出动画均播放一遍后停驻：问题行淡入 1 次、行内打字机 1 次、Thinking… 脉冲 3 次
  // （3 × 0.3s = 与 THINK_DUR 同周期）、输入框打字（input-type）与清空（input-hide）
  // 各 1 次且 fill both → 停驻最终态；不循环
  expect(
    await terminal
      .locator('.user-question')
      .first()
      .evaluate((el) => getComputedStyle(el).animationIterationCount),
  ).toBe('1')
  expect(
    await terminal
      .locator('.typewriter-text')
      .evaluate((el) => getComputedStyle(el).animationIterationCount),
  ).toBe('1')
  expect(
    await terminal
      .locator('.terminal-status--thinking')
      .first()
      .evaluate((el) => getComputedStyle(el).animationIterationCount),
  ).toBe('1, 3')
  expect(
    await terminal
      .locator('.terminal-typed')
      .first()
      .evaluate((el) => getComputedStyle(el).animationIterationCount),
  ).toBe('1, 1')
  expect(
    await terminal
      .locator('.terminal-typed')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('input-type, input-hide')

  // 仅 live 红点无限循环（软脉冲，0.9s，opacity 1↔0.35）——持续闪烁的 live 状态指示
  expect(
    await terminal
      .locator('.live-dot')
      .evaluate((el) => getComputedStyle(el).animationIterationCount),
  ).toBe('infinite')
  expect(
    await terminal.locator('.live-dot').evaluate((el) => getComputedStyle(el).animationDuration),
  ).toBe('0.9s')
  // 停驻光标：末轮发送后出现（cursor-appear 1 次）并块状闪烁无限循环（演出停驻态）
  expect(
    await terminal
      .locator('.terminal-input-cursor')
      .evaluate((el) => getComputedStyle(el).animationIterationCount),
  ).toBe('infinite, 1')

  // 等演出播完，停在最终态：末轮回答完全可见（opacity 1）、tagline 全文揭示、
  // 输入框全部清空（每轮打字文本 opacity 0）、停驻光标出现在输入框
  await expect
    .poll(
      () =>
        terminal
          .locator('.hero-line')
          .last()
          .evaluate((el) => getComputedStyle(el).opacity),
      { timeout: 25_000 },
    )
    .toBe('1')
  await expect(terminal.getByText('了解真相，才能获得真正的自由')).toBeVisible()
  for (let i = 0; i < 3; i++) {
    expect(
      await terminal
        .locator('.terminal-typed')
        .nth(i)
        .evaluate((el) => getComputedStyle(el).opacity),
    ).toBe('0')
  }
  await expect(terminal.locator('.terminal-input-cursor')).toBeVisible()
})

test('hero terminal: per-round choreography — input types, then send, then Thinking… → Done. → answer', async ({
  page,
}) => {
  await page.goto('/')
  const terminal = page.locator('.hero-terminal')
  const typed = terminal.locator('.terminal-typed')

  // 每轮：输入框逐字符打字（第 0 条动画）先开始，发送（第 1 条动画 = 输入框清空）在后
  const delays = (el: Element) =>
    getComputedStyle(el)
      .animationDelay.split(',')
      .map((d) => parseFloat(d))
  const [typeDelay0, hideDelay0] = await typed.first().evaluate(delays)
  expect(typeDelay0!).toBeGreaterThan(0)
  expect(hideDelay0!).toBeGreaterThan(typeDelay0!)

  for (let r = 0; r < 3; r++) {
    const turn = terminal.locator('.hero-turn').nth(r)
    // 发送：问题进入 transcript（user-question 淡入）与输入框清空（input-hide）同一时刻
    const questionDelay = parseFloat(
      await turn.locator('.user-question').evaluate((el) => getComputedStyle(el).animationDelay),
    )
    const roundHide = (await typed.nth(r).evaluate(delays))[1]!
    expect(questionDelay).toBe(roundHide)

    // 状态行与回答行依次晚于发送：Thinking… → Done. → 回答
    const thinkingDelay = (await turn
      .locator('.terminal-status--thinking')
      .evaluate((el) => getComputedStyle(el).animationDelay.split(',')[0]))!
    const doneDelay = parseFloat(
      await turn
        .locator('.terminal-status--done')
        .evaluate((el) => getComputedStyle(el).animationDelay),
    )
    expect(parseFloat(thinkingDelay)).toBeGreaterThan(questionDelay)
    expect(doneDelay).toBeGreaterThan(parseFloat(thinkingDelay))
    const answerDelay = parseFloat(
      await turn
        .locator('.hero-line')
        .first()
        .evaluate((el) => getComputedStyle(el).animationDelay),
    )
    expect(answerDelay).toBeGreaterThan(doneDelay)
  }

  // 轮次严格串行（真实会话顺序）：下一轮输入框打字不早于上一轮最后一行揭示
  const nextType = (await typed.nth(1).evaluate(delays))[0]!
  const firstRoundLastAnswer = parseFloat(
    await terminal
      .locator('.hero-turn')
      .nth(0)
      .locator('.hero-line')
      .last()
      .evaluate((el) => getComputedStyle(el).animationDelay),
  )
  expect(nextType).toBeGreaterThan(firstRoundLastAnswer)

  // 停驻光标：末轮发送后出现（演出停驻态，块状闪烁继续）
  const lastHide = (await typed.nth(2).evaluate(delays))[1]!
  const cursorAppear = (await terminal.locator('.terminal-input-cursor').evaluate(delays))[1]!
  expect(cursorAppear).toBeGreaterThan(lastHide)
})

test('hero terminal: reduced-motion skips all animations, full text visible, no errors', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (err) => pageErrors.push(err.message))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const terminal = page.locator('.hero-terminal')

  // 全文直接可见（无需等待动画）：三轮提问（transcript 用户行 + 输入框打字文本）、
  // 状态行 Thinking…/Done.、回答（简介 + tagline 全文）
  for (const text of ['你是谁', '这个站有什么', '怎么联系']) {
    await expect(terminal.locator('.user-question').filter({ hasText: text })).toBeVisible()
    await expect(terminal.locator('.terminal-input-text').filter({ hasText: text })).toBeVisible()
  }
  await expect(terminal.locator('.terminal-status--thinking').first()).toBeVisible()
  await expect(terminal.locator('.terminal-status--done').first()).toBeVisible()
  await expect(terminal.getByText('了解真相，才能获得真正的自由')).toBeVisible()

  // 全部动画禁用（animation: none）：问题行淡入 / 状态行 / 打字机 / 输入框打字与清空 /
  // 停驻光标 / live 点脉冲 / hero 入场
  for (const sel of [
    '.user-question',
    '.terminal-status',
    '.typewriter-text',
    '.terminal-typed',
    '.terminal-input-cursor',
    '.live-dot',
    '.hero-enter',
  ]) {
    const root = sel === '.hero-enter' ? page : terminal
    expect(
      await root
        .locator(sel)
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe('none')
  }
  // 输入区：输入框全文直接可见（问题行内排布，不重叠不隐藏）；输入区光标隐藏
  await expect(terminal.locator('.terminal-typed').first()).toBeVisible()
  expect(
    await terminal.locator('.terminal-input-cursor').evaluate((el) => getComputedStyle(el).display),
  ).toBe('none')
  // 全程无动画/脚本报错
  expect(pageErrors).toHaveLength(0)
})

test('post list: terminal output lines show mono date, title and #tags (no description)', async ({
  page,
}) => {
  // 期望值从内容源计算（与构建期内容清单同一契约：非 draft 文章、日期倒序）
  const published = publishedPosts()

  await page.goto('/')
  const rows = page.locator('.post-row')
  // 终端输出行由内容清单驱动：新增文章自动上首页（数量与内容源一致）
  await expect(rows).toHaveCount(published.length)
  // 最新文章在最前（日期倒序）
  await expect(rows.first().locator('.post-row-title')).toHaveText(published[0]?.title ?? '')

  for (const post of published) {
    const row = rows.filter({ hasText: post.title })
    await expect(row).toBeVisible()

    // 每行内容 = mono 日期 + 标题 + #标签（终端 ls 输出行形态）
    await expect(row.locator('.post-row-date')).toHaveText(post.date)
    const dateFont = await row
      .locator('.post-row-date')
      .evaluate((el) => getComputedStyle(el).fontFamily)
    expect(dateFont).toContain('JetBrains Mono')
    await expect(row.locator('.post-row-title')).toHaveText(post.title)

    // 摘要不再渲染于列表（内容管线保留 description 字段，文章页/SEO 继续使用）
    await expect(row.getByText(post.description)).toHaveCount(0)

    // #标签：每个标签渲染为 #tag 且仅展示、不跳转（当前无标签路由）
    for (const tag of post.tags ?? []) {
      const tagEl = row.getByText(`#${tag}`, { exact: true })
      await expect(tagEl).toBeVisible()
      await expect(tagEl).not.toHaveAttribute('href')
    }
  }

  // 整行为单个链接（行本身即链接，指向 /posts/:slug，无嵌套链接）
  for (let i = 0; i < published.length; i++) {
    await expect(rows.nth(i)).toHaveAttribute('href', `/posts/${published[i]?.slug}`)
  }
})

test('clicking a post row opens the post page (whole row is clickable)', async ({ page }) => {
  await page.goto('/')

  // 整行可点击：点击日期区域（非标题文本本身）同样进入文章页
  const row = page.locator('.post-row').filter({ hasText: '你好，世界' })
  await row.locator('.post-row-date').click()
  await expect(page).toHaveURL(/\/posts\/hello-world/)
  await expect(page.getByRole('heading', { name: '你好，世界' })).toBeVisible()
})

test('post row hover feedback: terminal prompt fades in + title underline, no background inversion (light & dark)', async ({
  page,
}) => {
  await page.goto('/')
  const row = page.locator('.post-row').first()
  const prompt = row.locator('.post-row-prompt')
  const title = row.locator('.post-row-title')

  // 归一化亮色（初始主题由环境决定，先切到已知状态）
  const html = page.locator('html')
  if (((await html.getAttribute('class')) ?? '').includes('dark')) {
    await page.getByRole('button', { name: '切换暗色模式' }).click()
  }

  // 默认态：提示符隐藏（opacity 0）、标题无下划线
  await expect(prompt).toHaveText('>')
  await expect(prompt).toHaveCSS('opacity', '0')
  expect(await title.evaluate((el) => getComputedStyle(el).textDecorationLine)).not.toContain(
    'underline',
  )

  // hover 行：行首「>」提示符淡入（opacity 1）、标题 accent 色 + 下划线、
  // 无背景反白、日期/标签保持 muted 灰
  await row.hover()
  await expect(prompt).toHaveCSS('opacity', '1')
  await expect(title).toHaveCSS('color', 'rgb(26, 26, 26)') // accent = 近黑（亮色）
  await expect(title).toHaveCSS('text-decoration-line', 'underline')
  await expect(row).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)') // 无黑白反转
  await expect(row.locator('.post-row-date')).toHaveCSS('color', 'rgb(102, 102, 102)')
  await expect(row.locator('.post-row-tag').first()).toHaveCSS('color', 'rgb(102, 102, 102)')

  // 暗色模式：同一反馈（accent = 近白、muted = 浅灰，背景同样不反白）
  await page.getByRole('button', { name: '切换暗色模式' }).click()
  await row.hover()
  await expect(prompt).toHaveCSS('opacity', '1')
  await expect(title).toHaveCSS('color', 'rgb(230, 230, 230)')
  await expect(title).toHaveCSS('text-decoration-line', 'underline')
  await expect(row).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(row.locator('.post-row-date')).toHaveCSS('color', 'rgb(158, 158, 158)')
  await expect(row.locator('.post-row-tag').first()).toHaveCSS('color', 'rgb(158, 158, 158)')
})

test('post list entrance: parallel with the hero show, staggered fade-in (issue #40)', async ({
  page,
}) => {
  await page.goto('/')
  const terminal = page.locator('.hero-terminal')
  const firstRow = page.locator('.post-row-enter').first()

  // 行入场为纯 CSS（淡入 + 轻微上移，与 hero 逐段入场同节奏）
  await expect(firstRow).toHaveCSS('animation-name', 'row-in')
  // 入场与终端演出并行开始（issue #40）：入场延迟不再大于演出末段——首行在演出
  // 早期即开始入场（旧行为：等演出播完才作为最后一幕入场）；末轮回答揭示时刻晚得多
  const rowDelay = parseFloat(await firstRow.evaluate((el) => getComputedStyle(el).animationDelay))
  expect(rowDelay).toBeLessThan(5)
  const lastAnswerDelay = parseFloat(
    await terminal
      .locator('.hero-line')
      .last()
      .evaluate((el) => getComputedStyle(el).animationDelay),
  )
  expect(rowDelay).toBeLessThan(lastAnswerDelay)
  // 行间逐行错开（--i * --row-gap）
  const secondRowDelay = parseFloat(
    await page
      .locator('.post-row-enter')
      .nth(1)
      .evaluate((el) => getComputedStyle(el).animationDelay),
  )
  expect(secondRowDelay).toBeGreaterThan(rowDelay)

  // prefers-reduced-motion：行入场禁用（animation: none）、行直接可见、无报错
  const pageErrors: string[] = []
  page.on('pageerror', (err) => pageErrors.push(err.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.getByText('你好，世界')).toBeVisible()
  await expect(page.locator('.post-row-enter').first()).toHaveCSS('animation-name', 'none')
  // prefers-reduced-motion：行反馈过渡禁用（提示符瞬时切换，无动画）
  await expect(page.locator('.post-row-prompt').first()).toHaveCSS('transition-duration', '0s')
  expect(pageErrors).toHaveLength(0)
})

test('post rows are keyboard reachable: Tab focus, visible focus style, Enter opens the post', async ({
  page,
}) => {
  await page.goto('/')

  // 归一化亮色（focus-visible 反白断言用）
  const html = page.locator('html')
  if (((await html.getAttribute('class')) ?? '').includes('dark')) {
    await page.getByRole('button', { name: '切换暗色模式' }).click()
  }

  // 等水合完成（点阵 canvas 仅客户端挂载）再按 Tab，避免快速 Tab 落在水合期间被吞
  await expect(page.locator('canvas.bg-dots')).toHaveCount(1)
  // Tab 顺序：文章 → 关于 → 切换 → GitHub → RSS → hero GitHub 外链 → 第一条文章行
  for (let i = 0; i < 7; i++) await page.keyboard.press('Tab')
  // 行本身即单个链接
  const firstRowLink = page.locator('.post-row').first()
  await expect(firstRowLink).toBeFocused()

  // 键盘焦点反馈（与 hover 同一机制）：行首「>」提示符淡入 + 标题下划线，背景不反白
  await expect(firstRowLink.locator('.post-row-prompt')).toHaveCSS('opacity', '1')
  await expect(firstRowLink.locator('.post-row-title')).toHaveCSS(
    'text-decoration-line',
    'underline',
  )
  await expect(firstRowLink).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')

  // Enter 打开最新文章（期望值从内容源计算，嵌套文章同样可达）
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`/posts/${publishedPosts()[0]?.slug}`))
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
  // 日期在头部信息区与左栏文章索引重复出现（issue #29）：限定头部，避免 strict-mode 冲突
  await expect(page.locator('.post-header time').first()).toHaveText('2026-08-10')
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

test('post page right TOC: three-column layout ≥1024, h2/h3 two levels with h3 indented, sticky (issue #30)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/posts/prerendered-blog-with-vite')

  const toc = page.getByRole('navigation', { name: '文章目录' })
  await expect(toc).toBeVisible()

  // 三栏网格：左索引 + 中正文 + 右目录（≥1024px 右栏常驻）
  const tracks = await page
    .locator('.post-layout')
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length)
  expect(tracks).toBe(3)

  // 右栏 sticky 跟随滚动（top 2rem，与左栏同节奏）
  expect(await toc.evaluate((el) => getComputedStyle(el).position)).toBe('sticky')

  // 目录项 = 正文 h2/h3 锚点：href 指向标题 id（github-slugger 剔除全角冒号）
  const h2Link = toc.getByRole('link', { name: '渲染策略：构建期一次性渲染' })
  await expect(h2Link).toBeVisible()
  await expect(h2Link).toHaveAttribute('href', '#渲染策略构建期一次性渲染')
  await expect(toc.getByRole('link', { name: '目录与锚点' })).toBeVisible()

  // h3 子节缩进（两级目录层级）：h3 项左移量大于 h2 项
  const h2Left = await h2Link.evaluate((el) => el.getBoundingClientRect().left)
  const h3Left = await toc
    .getByRole('link', { name: '代码高亮：Shiki 双主题' })
    .evaluate((el) => el.getBoundingClientRect().left)
  expect(h3Left).toBeGreaterThan(h2Left)

  // <1024px：右栏整栏隐藏、退化为两栏
  await page.setViewportSize({ width: 1000, height: 800 })
  await expect(toc).toBeHidden()
  const tracksSmall = await page
    .locator('.post-layout')
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length)
  expect(tracksSmall).toBe(2)
})

test('post page TOC scroll-spy: current section highlighted while scrolling (IntersectionObserver)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/posts/prerendered-blog-with-vite')

  const toc = page.getByRole('navigation', { name: '文章目录' })
  await expect(toc).toBeVisible()

  // 页面顶部：无当前章节高亮
  await expect(toc.locator('a.post-toc-active')).toHaveCount(0)

  // 滚动到「踩过的坑」位于视口上部 35%（scroll-spy 观察带内）→ 该项高亮
  await page.evaluate(() => {
    const heading = document.getElementById('踩过的坑') as HTMLElement
    const y = heading.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.35
    window.scrollTo({ top: y, behavior: 'instant' })
  })
  const active = toc.getByRole('link', { name: '踩过的坑' })
  await expect(active).toHaveClass(/post-toc-active/)
  await expect(active).toHaveAttribute('aria-current', 'true')
  // 其他章节不高亮
  await expect(toc.getByRole('link', { name: '下一步' })).not.toHaveClass(/post-toc-active/)

  // 继续滚动到「部署形态」→ 高亮跟随切换
  await page.evaluate(() => {
    const heading = document.getElementById('部署形态') as HTMLElement
    const y = heading.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.35
    window.scrollTo({ top: y, behavior: 'instant' })
  })
  await expect(toc.getByRole('link', { name: '部署形态' })).toHaveClass(/post-toc-active/)
  await expect(toc.getByRole('link', { name: '踩过的坑' })).not.toHaveClass(/post-toc-active/)
})

test('post page TOC click: native hash jump, smooth scroll and scroll-margin-top (issue #30)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/posts/hello-world')

  const toc = page.getByRole('navigation', { name: '文章目录' })
  await expect(toc).toBeVisible()

  // 平滑滚动由 html scroll-behavior: smooth 提供（原生 hash 跳转）
  expect(await page.locator('html').evaluate((el) => getComputedStyle(el).scrollBehavior)).toBe(
    'smooth',
  )

  // 标题预留 scroll-margin-top（锚点定位偏移）
  const heading = page.getByRole('heading', { level: 2, name: '接下来' })
  const margin = parseFloat(await heading.evaluate((el) => getComputedStyle(el).scrollMarginTop))
  expect(margin).toBeGreaterThan(0)

  // 点击目录项：URL hash 更新（CJK 百分号编码）+ 平滑滚动定位到标题
  await toc.getByRole('link', { name: '接下来' }).click()
  await expect.poll(() => page.evaluate(() => decodeURIComponent(location.hash))).toBe('#接下来')
  // 滚动结束后标题位于视口上部（scroll-margin-top 偏移处），且该项成为当前章节
  await expect
    .poll(() => heading.evaluate((el) => Math.round(el.getBoundingClientRect().top)))
    .toBeLessThan(100)
  await expect(toc.getByRole('link', { name: '接下来' })).toHaveClass(/post-toc-active/)
})

test('post page without TOC: right column hidden, layout falls back to two columns (issue #30)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  // second-post 正文无 h2/h3 标题 → toc 为空
  await page.goto('/posts/second-post')

  // 右栏目录整栏隐藏：无「文章目录」导航语义、无 .post-toc 结构
  await expect(page.getByRole('navigation', { name: '文章目录' })).toHaveCount(0)
  await expect(page.locator('.post-toc')).toHaveCount(0)

  // 退化为两栏：左索引 + 中正文（右栏不占网格轨道）
  const tracks = await page
    .locator('.post-layout')
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length)
  expect(tracks).toBe(2)
  await expect(page.getByRole('navigation', { name: '文章索引' })).toBeVisible()
  await expect(page.locator('.post-main')).toBeVisible()
})

test('prev/next navigation stays within the same directory, stopping at boundaries (issue #43)', async ({
  page,
}) => {
  // 期望链从内容源计算（同一契约：非 draft、日期倒序、同目录相邻、边界停止）
  const rootPosts = publishedPosts().filter((post) => expectedDirectory(post.slug) === '')

  // 根层目录链：从目录内最新沿日期倒序翻到最旧，两端边界处无越界链接
  const rootChain = rootPosts.map((post) => post.slug)
  await page.goto(`/posts/${rootChain[0]}`)
  await expect(page.getByRole('link', { name: /上一篇/ })).toHaveCount(0)
  for (let i = 0; i < rootChain.length - 1; i++) {
    await page.getByRole('link', { name: /下一篇/ }).click()
    // 等待导航完成（React Router 页面切换）后再继续，避免点击落在过渡中的 DOM 上
    await expect(page).toHaveURL(new RegExp(`/posts/${rootChain[i + 1]}`))
  }
  await expect(page.getByRole('link', { name: /上一篇/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /下一篇/ })).toHaveCount(0)

  // 嵌套目录：01 → 02 同目录相邻——下一篇不指向全局第二新的根层文章（不跨界跳转）
  const one = expectedNeighbors('pi-agent/01')
  expect(one.newer).toBeUndefined() // 目录内最新：无上一篇
  expect(one.older?.slug).toBe('pi-agent/02') // 下一篇 = 同目录内更旧
  await page.goto('/posts/pi-agent/01')
  await expect(page.getByRole('link', { name: /上一篇/ })).toHaveCount(0)
  const nextLink = page.getByRole('link', { name: /下一篇/ })
  await expect(nextLink).toHaveAttribute('href', `/posts/${one.older?.slug}`)

  // 02：上一篇 = 01（同目录内更新），目录边界处停止（无下一篇）
  await nextLink.click()
  await expect(page).toHaveURL(/\/posts\/pi-agent\/02/)
  const two = expectedNeighbors('pi-agent/02')
  expect(two.newer?.slug).toBe('pi-agent/01')
  expect(two.older).toBeUndefined()
  await expect(page.getByRole('link', { name: /上一篇/ })).toHaveAttribute(
    'href',
    `/posts/${two.newer?.slug}`,
  )
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

test('nested post images: rewritten to /assets/<目录>/<文件名> and served without collision (issue #43)', async ({
  request,
}) => {
  // 嵌套文章 HTML：assets/ 引用按所在目录路径化为站点绝对路径
  const html = await (await request.get('/posts/pi-agent/01')).text()
  expect(html).toContain('src="/assets/pi-agent/fixture.png"')

  // 嵌套资源按目录路径可访问（dev 中间件与构建产物同一契约，此处验证构建产物）
  const nested = await request.get('/assets/pi-agent/fixture.png')
  expect(nested.status()).toBe(200)

  // 根层同名图片仍指向根层文件：不同目录同名图片互不撞车（两份文件内容不同）
  const root = await request.get('/assets/fixture.png')
  expect(root.status()).toBe(200)
  expect((await nested.body()).length).not.toBe((await root.body()).length)
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

test('geek-style design: mono fonts; links are bold+underline with inverted hover, nav active shares mechanism', async ({
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

  // 亮色 = 白底黑字（html 背景纯白、文字近黑，均灰阶）
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(page.locator('html')).toHaveCSS('color', 'rgb(26, 26, 26)')

  // 全站链接样式 = 下划线 + 加粗（不再依赖颜色区分：链接与同上下文文本同色）
  // 页脚链接继承 footer 的 muted 灰（与页脚正文同色），hover 反白用 accent 令牌覆盖
  const ccLink = page.getByRole('link', { name: 'CC BY-NC-SA 4.0' })
  expect(await ccLink.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('700')
  expect(await ccLink.evaluate((el) => getComputedStyle(el).textDecorationLine)).toContain(
    'underline',
  )
  expect(await ccLink.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(102, 102, 102)')

  // hover 反白：亮色 = 黑底白字
  await ccLink.hover()
  await expect(ccLink).toHaveCSS('background-color', 'rgb(26, 26, 26)')
  await expect(ccLink).toHaveCSS('color', 'rgb(255, 255, 255)')

  // 暗色 = 黑底白字反色（背景近黑、文字近白），hover 反白 = 白底黑字
  await page.getByRole('button', { name: '切换暗色模式' }).click()
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(10, 10, 10)')
  await expect(page.locator('html')).toHaveCSS('color', 'rgb(230, 230, 230)')
  await ccLink.hover()
  await expect(ccLink).toHaveCSS('background-color', 'rgb(230, 230, 230)')
  await expect(ccLink).toHaveCSS('color', 'rgb(0, 0, 0)')

  // 导航高亮沿用同一机制（加粗 + 下划线，不再依赖颜色区分）
  await page.getByRole('link', { name: '关于' }).click()
  await expect(page).toHaveURL(/\/about/)
  const aboutNav = page.getByRole('link', { name: '关于' })
  await expect(aboutNav).toHaveClass(/nav-active/)
  expect(await aboutNav.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('700')
  expect(await aboutNav.evaluate((el) => getComputedStyle(el).textDecorationLine)).toContain(
    'underline',
  )
  // 非 active 导航项为普通文本外观（无下划线、不加粗）
  const postsNav = page.getByRole('link', { name: '文章' })
  expect(await postsNav.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('400')
  expect(await postsNav.evaluate((el) => getComputedStyle(el).textDecorationLine)).not.toContain(
    'underline',
  )
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
  // 文章行在移动端同样可见（整行可点，标题/标签换行不撑破小屏）
  await expect(page.locator('.post-row').first()).toBeVisible()
  const rowNoOverflow = await page
    .locator('.post-row')
    .first()
    .evaluate((el) => el.scrollWidth <= el.clientWidth)
  expect(rowNoOverflow).toBe(true)
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

test('dots adapt to theme: light dark-gray, dark light-gray (grayscale)', async ({ page }) => {
  await page.goto('/')
  const canvas = page.locator('canvas.bg-dots')
  await expect(canvas).toHaveCount(1)

  // 归一化到亮色，断言亮色深灰（初始主题由环境决定，先切到已知状态）
  const html = page.locator('html')
  if (((await html.getAttribute('class')) ?? '').includes('dark')) {
    await page.getByRole('button', { name: '切换暗色模式' }).click()
  }
  await expect(canvas).toHaveAttribute('data-dots-color', '#1a1a1a')

  // 切到暗色：点阵颜色变为浅灰（黑底白字反色，不再绿调）
  await page.getByRole('button', { name: '切换暗色模式' }).click()
  await expect(canvas).toHaveAttribute('data-dots-color', '#e6e6e6')
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

/* ===== 嵌套目录文章（issue #41）：递归聚合 + 嵌套路由 + SEO 跟随 ===== */

test('nested post: /posts/<dir path> opens; prerendered as .html and index.html (issue #41)', async ({
  request,
}) => {
  // 直达嵌套 URL（slug = 相对目录路径）返回 200，源码含正文（爬虫不执行 JS 即可读）
  const response = await request.get('/posts/pi-agent/01')
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain('什么是 pi agent')
  expect(html).toContain('递归聚合')

  // 双形态产物：<slug>.html 与 <slug>/index.html 均可访问（与根层文章同一输出契约）
  const indexHtml = await request.get('/posts/pi-agent/01/')
  expect(indexHtml.status()).toBe(200)
  expect(await indexHtml.text()).toContain('什么是 pi agent')
})

test('nested post: canonical/OG/JSON-LD/sitemap/RSS derive from slug (issue #41)', async ({
  request,
}) => {
  // canonical + og:url 跟随嵌套 slug
  const post = await (await request.get('/posts/pi-agent/01')).text()
  expect(post).toContain('rel="canonical" href="https://hacxy.cn/posts/pi-agent/01"')
  expect(post).toContain('property="og:url" content="https://hacxy.cn/posts/pi-agent/01"')

  // JSON-LD Article：url / mainEntityOfPage 由 slug 推导
  expect(post).toContain('"@type": "Article"')
  expect(post).toContain('"url": "https://hacxy.cn/posts/pi-agent/01"')
  expect(post).toContain('"mainEntityOfPage": "https://hacxy.cn/posts/pi-agent/01"')

  // OG 图：构建期生成于嵌套路径且可访问
  expect(post).toContain('property="og:image" content="https://hacxy.cn/og/posts/pi-agent/01.svg"')
  const og = await (await request.get('/og/posts/pi-agent/01.svg')).text()
  expect(og).toContain('<svg')
  expect(og).toContain('什么是 pi agent')

  // sitemap 含嵌套 loc
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).toContain('<loc>https://hacxy.cn/posts/pi-agent/01</loc>')

  // RSS 条目链接/guid 跟随嵌套 slug，全文进 content:encoded
  const feed = await (await request.get('/feed.xml')).text()
  expect(feed).toContain('<link>https://hacxy.cn/posts/pi-agent/01</link>')
  expect(feed).toContain('<guid isPermaLink="true">https://hacxy.cn/posts/pi-agent/01</guid>')
  expect(feed).toContain('<title>什么是 pi agent</title>')
})

test('nested post: listed on homepage in global date-desc order (issue #41)', async ({ page }) => {
  const published = publishedPosts()

  await page.goto('/')
  // 嵌套文章自动上首页（最新在前），行链接指向嵌套 URL
  const row = page.locator('.post-row').filter({ hasText: '什么是 pi agent' })
  await expect(row).toBeVisible()
  await expect(row).toHaveAttribute('href', '/posts/pi-agent/01')

  // 全局日期倒序平铺：首页首行 = 最新文章（与内容源一致）
  await expect(page.locator('.post-row').first().locator('.post-row-title')).toHaveText(
    published[0]?.title ?? '',
  )
})

test('nested post: opens via client navigation; prev/next stays inside the directory (issue #43)', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('link', { name: '什么是 pi agent' }).click()
  await expect(page).toHaveURL(/\/posts\/pi-agent\/01/)
  await expect(page.getByRole('heading', { name: '什么是 pi agent' })).toBeVisible()

  // 同目录相邻（issue #43）：目录内最新无上一篇，下一篇 = 同目录的 02
  //（不跨界跳到全局第二新的根层文章）；02 的上一篇 = 01、无下一篇（目录边界）
  const one = expectedNeighbors('pi-agent/01')
  expect(one.newer).toBeUndefined()
  expect(one.older?.slug).toBe('pi-agent/02')
  await expect(page.getByRole('link', { name: /上一篇/ })).toHaveCount(0)
  const next = page.getByRole('link', { name: /下一篇/ })
  await expect(next).toHaveAttribute('href', `/posts/${one.older?.slug}`)
  await next.click()
  await expect(page).toHaveURL(/\/posts\/pi-agent\/02/)
  await expect(page.getByRole('link', { name: /上一篇/ })).toHaveAttribute(
    'href',
    '/posts/pi-agent/01',
  )
  await expect(page.getByRole('link', { name: /下一篇/ })).toHaveCount(0)
})

test('favicon.svg is monochrome (black/white) and consistent with the site theme', async ({
  request,
}) => {
  const favicon = await (await request.get('/favicon.svg')).text()
  // 黑白灰阶：白字形 + 黑底，无任何绿色/紫色残留
  expect(favicon).toContain('#ffffff')
  expect(favicon).toContain('#111111')
  expect(favicon).not.toContain('#3fb950')
  expect(favicon).not.toContain('#1a7f37')
  expect(favicon).not.toContain('#56d364')
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

test('background texture adapts to theme: light dark-gray, dark light-gray (grayscale)', async ({
  page,
  request,
}) => {
  // 亮暗两套变体的颜色（data-URI 中 # 编码为 %23）：亮色深灰 #1a1a1a、暗色浅灰 #e6e6e6
  const html = await (await request.get('/')).text()
  const cssHref = html.match(/href="([^"]+\.css)"/)?.[1]
  expect(cssHref).toBeTruthy()
  const css = await (await request.get(cssHref as string)).text()
  expect(css).toContain('%231a1a1a')
  expect(css).toContain('%23e6e6e6')

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
  // 模板要素：黑白灰阶（近黑底 + 白强调竖条/站点名）+ 等宽字体 + 文章标题（标题可能折行，剥离标签后断言全文）
  expect(og).toContain('111111')
  expect(og).toContain('ffffff')
  expect(og).not.toContain('3fb950')
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

  // 等待 React 水合完成（点阵 canvas 仅客户端挂载）再按 Tab：
  // 避免快速 Tab 落在水合期间被吞掉导致焦点整体偏移一位（既有偶发 flake 的根因）
  await expect(page.locator('canvas.bg-dots')).toHaveCount(1)

  // Tab 顺序：文章 → 关于 → 主题切换 → GitHub → RSS（键盘无障碍验收，PRD 用户故事 33）
  // 限定 navigation：避免与 hero 终端内 GitHub 外链（名字含 github）歧义（strict mode）
  const nav = page.getByRole('navigation')
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab')
  await expect(nav.getByRole('link', { name: 'GitHub' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(nav.getByRole('link', { name: 'RSS' })).toBeFocused()
})

test('high-DPI root font-size scaling: 1920px → 18px, 2560px → 20px, below 1920px stays 16px', async ({
  browser,
}) => {
  // 高分屏根字号阶梯（issue #26）：纯 CSS 媒体查询（min-width），rem 单位全部等比放大。
  // 期望值表：视口宽 → 根字号 → hero 终端字号（0.875rem）→ 文章行标题字号（1rem）→
  // 内容列宽（max-w-2xl = 42rem，672→756→840px，中文行宽仍在舒适区）。
  const cases = [
    { width: 1440, root: 16, terminal: 14, rowTitle: 16, column: 672 },
    { width: 1919, root: 16, terminal: 14, rowTitle: 16, column: 672 },
    { width: 1920, root: 18, terminal: 15.75, rowTitle: 18, column: 756 },
    { width: 2559, root: 18, terminal: 15.75, rowTitle: 18, column: 756 },
    { width: 2560, root: 20, terminal: 17.5, rowTitle: 20, column: 840 },
    { width: 3840, root: 20, terminal: 17.5, rowTitle: 20, column: 840 },
  ]

  for (const c of cases) {
    const context = await browser.newContext({ viewport: { width: c.width, height: 900 } })
    const page = await context.newPage()
    await page.goto('/')

    // 根字号（html computed font-size）
    const root = parseFloat(
      await page.locator('html').evaluate((el) => getComputedStyle(el).fontSize),
    )
    expect(root).toBe(c.root)

    // 正文/终端/文章行随根字号等比缩放：hero 终端 0.875rem、文章行标题 1rem
    const terminalFont = parseFloat(
      await page.locator('.hero-terminal').evaluate((el) => getComputedStyle(el).fontSize),
    )
    expect(terminalFont).toBeCloseTo(c.terminal, 5)
    const rowFont = parseFloat(
      await page
        .locator('.post-row-title')
        .first()
        .evaluate((el) => getComputedStyle(el).fontSize),
    )
    expect(rowFont).toBeCloseTo(c.rowTitle, 5)

    // 内容列宽随 rem 自然变宽（max-w-2xl = 42rem）
    const columnWidth = await page
      .locator('.max-w-2xl')
      .evaluate((el) => el.getBoundingClientRect().width)
    expect(columnWidth).toBeCloseTo(c.column, 1)

    await context.close()
  }
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

test('post header: big title + mono date/updated (only when present) + #tags + description', async ({
  page,
}) => {
  await page.goto('/posts/prerendered-blog-with-vite')
  const header = page.locator('.post-header')

  // 大标题（h1 信息区第一层级）
  await expect(header.getByRole('heading', { level: 1 })).toHaveText(
    '用 React + Vite 搭一个构建期预渲染的静态博客',
  )

  // mono 元数据行：日期 + updated（有才显示）
  await expect(header.locator('.post-meta time').first()).toHaveText('2026-08-11')
  expect(
    await header.locator('.post-meta').evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain('JetBrains Mono')
  await expect(header.locator('.post-updated')).toHaveText('updated 2026-08-12')
  await expect(header.locator('.post-updated time')).toHaveAttribute('datetime', '2026-08-12')

  // #标签：仅展示、不跳转（当前无标签路由）
  const tags = header.locator('.post-tag')
  await expect(tags).toHaveCount(3)
  await expect(tags.nth(0)).toHaveText('#React')
  await expect(tags.nth(1)).toHaveText('#Vite')
  await expect(tags.nth(2)).toHaveText('#架构')
  for (let i = 0; i < 3; i++) {
    await expect(tags.nth(i)).not.toHaveAttribute('href')
  }

  // 描述
  await expect(header.locator('.post-description')).toContainText(
    '本文记录 hacxy.cn 重建的技术选型与实现',
  )

  // 未声明 updated 的文章不渲染 updated（hello-world 无 updated 字段）
  await page.goto('/posts/hello-world')
  const helloHeader = page.locator('.post-header')
  await expect(helloHeader.locator('.post-updated')).toHaveCount(0)
  await expect(helloHeader.getByText('updated')).toHaveCount(0)
  // 标签与描述仍在
  await expect(helloHeader.locator('.post-tag')).toHaveText(['#随笔'])
  await expect(helloHeader.locator('.post-description')).toContainText('博客重建后的第一篇测试文章')
})

test('post body typography: headings/paragraphs/lists/code/table/inline code have hierarchy and rhythm', async ({
  page,
}) => {
  await page.goto('/posts/prerendered-blog-with-vite')
  const body = page.locator('.post-body')

  // 标题层级：h2 > h3 字号；h2 以底部边框分隔章节（h3 无边框）
  const h2 = body.getByRole('heading', { level: 2, name: '渲染策略：构建期一次性渲染' })
  const h3 = body.getByRole('heading', { level: 3, name: '代码高亮：Shiki 双主题' })
  const h2Size = parseFloat(await h2.evaluate((el) => getComputedStyle(el).fontSize))
  const h3Size = parseFloat(await h3.evaluate((el) => getComputedStyle(el).fontSize))
  expect(h2Size).toBeGreaterThan(h3Size)
  expect(
    parseFloat(await h2.evaluate((el) => getComputedStyle(el).borderBottomWidth)),
  ).toBeGreaterThan(0)
  expect(parseFloat(await h3.evaluate((el) => getComputedStyle(el).borderBottomWidth))).toBe(0)

  // 段落：明确行高与底部留白（不再是零 margin 的 16px 墙）
  const p = body.locator('p').first()
  expect(await p.evaluate((el) => getComputedStyle(el).lineHeight)).not.toBe('normal')
  expect(parseFloat(await p.evaluate((el) => getComputedStyle(el).marginBottom))).toBeGreaterThan(0)

  // 列表：左缩进 + 行距
  expect(
    await body
      .locator('ul')
      .first()
      .evaluate((el) => getComputedStyle(el).paddingLeft),
  ).not.toBe('0px')
  expect(
    parseFloat(
      await body
        .locator('ul li')
        .first()
        .evaluate((el) => getComputedStyle(el).marginTop),
    ),
  ).toBeGreaterThanOrEqual(0)

  // 代码块独立成块：内边距 + 边框 + 圆角（不再贴地无框）
  const pre = body.locator('pre').first()
  expect(parseFloat(await pre.evaluate((el) => getComputedStyle(el).paddingTop))).toBeGreaterThan(0)
  expect(
    parseFloat(await pre.evaluate((el) => getComputedStyle(el).borderTopWidth)),
  ).toBeGreaterThan(0)
  expect(parseFloat(await pre.evaluate((el) => getComputedStyle(el).borderRadius))).toBeGreaterThan(
    0,
  )

  // 行内代码：mono + 独立底色/内边距；pre 内 code 保持无内边距（不误伤代码块）
  const inlineCode = body.locator('li code').filter({ hasText: 'updated' }).first()
  expect(await inlineCode.evaluate((el) => getComputedStyle(el).fontFamily)).toContain(
    'JetBrains Mono',
  )
  expect(
    parseFloat(await inlineCode.evaluate((el) => getComputedStyle(el).paddingLeft)),
  ).toBeGreaterThan(0)
  expect(await inlineCode.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
    'rgba(0, 0, 0, 0)',
  )
  expect(
    await body
      .locator('pre code')
      .first()
      .evaluate((el) => getComputedStyle(el).paddingTop),
  ).toBe('0px')

  // 表格：th/td 内边距 + 边框，th 加粗（层级分明）
  const th = body.locator('table th').first()
  expect(parseFloat(await th.evaluate((el) => getComputedStyle(el).paddingTop))).toBeGreaterThan(0)
  expect(
    parseFloat(await th.evaluate((el) => getComputedStyle(el).borderTopWidth)),
  ).toBeGreaterThan(0)
  expect(await th.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('700')
  const td = body.locator('table td').first()
  expect(parseFloat(await td.evaluate((el) => getComputedStyle(el).paddingTop))).toBeGreaterThan(0)
})

test('post body: blockquote is a distinct block (border + padding + background)', async ({
  page,
}) => {
  await page.goto('/posts/hello-world')
  const quote = page.locator('.post-body blockquote')
  await expect(quote).toBeVisible()
  expect(
    parseFloat(await quote.evaluate((el) => getComputedStyle(el).borderLeftWidth)),
  ).toBeGreaterThan(0)
  expect(
    parseFloat(await quote.evaluate((el) => getComputedStyle(el).paddingLeft)),
  ).toBeGreaterThan(0)
  expect(await quote.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
    'rgba(0, 0, 0, 0)',
  )
})

test('layout foundation: outer container widens to max-w-6xl; homepage/about content stays ~672px centered', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  // 全站容器放宽：布局外壳为 max-w-6xl（72rem = 1152px @16px 基准）
  const shell = page.locator('.max-w-6xl')
  await expect(shell).toHaveCount(1)
  expect(await shell.evaluate((el) => el.getBoundingClientRect().width)).toBeCloseTo(1152, 1)

  // 首页终端流内层收窄居中：内容列仍 ~672px（视觉零回归）
  const homeContent = page.locator('.max-w-2xl')
  await expect(homeContent).toHaveCount(1)
  const rect = await homeContent.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { width: r.width, left: r.left }
  })
  expect(rect.width).toBeCloseTo(672, 1)
  expect(Math.abs(rect.left - (1440 - 672) / 2)).toBeLessThan(1)

  // 关于页同样收窄居中
  await page.goto('/about')
  expect(
    await page.locator('.max-w-2xl').evaluate((el) => el.getBoundingClientRect().width),
  ).toBeCloseTo(672, 1)

  // 文章页：左栏索引 + 中栏正文两栏（issue #29），正文列自然收窄至 ~600px 阅读宽度
  await page.goto('/posts/prerendered-blog-with-vite')
  await expect(page.getByRole('navigation', { name: '文章索引' })).toBeVisible()
  expect(
    await page.locator('article').evaluate((el) => el.getBoundingClientRect().width),
  ).toBeCloseTo(600, 1)
})

test('post page left index: hierarchy tree — folders alpha first then posts date-desc, folders collapsible, current highlighted, sticky (issue #44)', async ({
  page,
}) => {
  // 期望值：从内容源计算（与内容清单同一契约：非 draft、日期倒序）；
  // 树中可见文章（issue #45）：被 showSubdirs:false 目录隐藏的子目录文章不在树中
  const visible = treeVisiblePosts()
  const rootPosts = visible.filter((post) => expectedDirectory(post.slug) === '')
  const visibleNested = visible.filter((post) => expectedDirectory(post.slug) !== '')
  const dirs = [
    ...new Set(
      visibleNested.map((post) => expectedDirectory(post.slug)).filter((d) => !d.includes('/')),
    ),
  ].sort()

  // ≥768px：两栏生效（1280px 视口下断言左栏索引）
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/posts/prerendered-blog-with-vite')

  const index = page.getByRole('navigation', { name: '文章索引' })
  await expect(index).toBeVisible()

  // 根层 = 文件夹（字母序）在前 + 根层文章（日期倒序）在后；当前文章为根层 →
  // 无自动展开的文件夹（全部收起）
  const folders = index.locator('.post-tree-folder')
  await expect(folders).toHaveCount(dirs.length)
  const rows = index.locator('.post-row')
  await expect(rows).toHaveCount(rootPosts.length)
  for (let i = 0; i < dirs.length; i++) {
    await expect(folders.nth(i)).toHaveAttribute('aria-expanded', 'false')
    await expect(folders.nth(i)).toContainText(`${dirs[i]}/`)
  }
  // 同层顺序：文件夹全部在文章之前（字母序在前）
  const lastFolderBottom = await folders.last().evaluate((el) => el.getBoundingClientRect().bottom)
  const firstRowTop = await rows.first().evaluate((el) => el.getBoundingClientRect().top)
  expect(lastFolderBottom).toBeLessThanOrEqual(firstRowTop)

  // 根层文章日期倒序：最新在最前
  await expect(rows.first().locator('.post-row-date')).toHaveText(rootPosts[0]?.date ?? '')
  await expect(rows.first().locator('.post-row-title')).toHaveText(rootPosts[0]?.title ?? '')

  // 每行 = mono 日期 + 标题（与首页终端行同构），指向对应文章页
  for (const post of rootPosts) {
    const row = rows.filter({ hasText: post.title })
    await expect(row).toHaveAttribute('href', `/posts/${post.slug}`)
    await expect(row.locator('.post-row-date')).toHaveText(post.date)
    expect(
      await row.locator('.post-row-date').evaluate((el) => getComputedStyle(el).fontFamily),
    ).toContain('JetBrains Mono')
    await expect(row.locator('.post-row-title')).toHaveText(post.title)
  }

  // 当前文章高亮：复用全站导航高亮机制（加粗 + 下划线）+ aria-current="page"
  const current = rows.filter({ hasText: '用 React + Vite 搭一个构建期预渲染的静态博客' })
  await expect(current).toHaveClass(/nav-active/)
  await expect(current).toHaveAttribute('aria-current', 'page')
  expect(await current.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('700')
  expect(await current.evaluate((el) => getComputedStyle(el).textDecorationLine)).toContain(
    'underline',
  )
  // 非当前行保持常规字重（不高亮）
  expect(
    await rows.filter({ hasText: '第二篇文章' }).evaluate((el) => getComputedStyle(el).fontWeight),
  ).toBe('400')

  // 子文件夹为可折叠抽屉：全部展开 → 嵌套文章（日期倒序）出现、aria-expanded 翻转；
  // 树含全部可见文章（同一清单、无丢失；被隐藏子目录文章按设计不在树中）；再点收起 → 子级卸载
  for (const folder of await folders.all()) {
    await folder.click()
    await expect(folder).toHaveAttribute('aria-expanded', 'true')
  }
  await expect(index.locator('.post-row')).toHaveCount(visible.length)
  for (const post of visibleNested) {
    await expect(index.locator('.post-row').filter({ hasText: post.title })).toHaveAttribute(
      'href',
      `/posts/${post.slug}`,
    )
  }
  // 同层规则递归：第一个文件夹（字母序）内文章日期倒序（最新在前）
  const firstDir = dirs[0]
  const firstDirPosts = visible.filter((post) => expectedDirectory(post.slug) === firstDir)
  const nestedRows = index.locator('.post-tree-list .post-tree-list .post-row')
  await expect(nestedRows.first().locator('.post-row-date')).toHaveText(
    firstDirPosts[0]?.date ?? '',
  )
  await expect(nestedRows.first().locator('.post-row-title')).toHaveText(
    firstDirPosts[0]?.title ?? '',
  )
  // 全部收起 → 子级卸载（不进可访问性树、不占 Tab 序），根层只余根层文章
  for (const folder of await folders.all()) {
    await folder.click()
    await expect(folder).toHaveAttribute('aria-expanded', 'false')
  }
  await expect(index.locator('.post-row')).toHaveCount(rootPosts.length)

  // 左栏 sticky 跟随滚动：滚动到正文底部后索引仍固定在视口内（top = sticky 偏移）
  expect(await index.evaluate((el) => getComputedStyle(el).position)).toBe('sticky')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  const stickyBox = await index.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom }
  })
  expect(stickyBox.top).toBeGreaterThanOrEqual(0)
  expect(stickyBox.top).toBeLessThan(200)
  expect(stickyBox.bottom).toBeLessThanOrEqual(900)

  // 点击任一行跳转对应文章页
  await rows.filter({ hasText: '第二篇文章' }).click()
  await expect(page).toHaveURL(/\/posts\/second-post/)

  // <768px：退回单栏——左栏索引隐藏（抽屉交互由后续工单接入），无横向溢出
  await page.setViewportSize({ width: 600, height: 800 })
  await expect(index).toBeHidden()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
})

test('post page left index: current branch auto-expands to its level on mount and client navigation (issue #44)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })

  // 直达嵌套文章（初始挂载）：当前分支自动展开至所在层，同层文章与子文件夹可见
  await page.goto('/posts/pi-agent/01')
  const index = page.getByRole('navigation', { name: '文章索引' })
  await expect(index).toBeVisible()
  const folder = index.getByRole('button', { name: /pi-agent\// })
  await expect(folder).toHaveAttribute('aria-expanded', 'true')
  await expect(folder).toContainText('pi-agent/')
  // 折叠标记反映可见状态：展开 ▾（收起时为 ▸）
  await expect(folder.locator('.post-tree-folder-marker')).toHaveText('▾')

  // 当前文章高亮：nav-active（加粗 + 下划线）+ aria-current="page"
  const current = index.getByRole('link', { name: /什么是 pi agent/ })
  await expect(current).toHaveClass(/nav-active/)
  await expect(current).toHaveAttribute('aria-current', 'page')
  expect(await current.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('700')
  expect(await current.evaluate((el) => getComputedStyle(el).textDecorationLine)).toContain(
    'underline',
  )

  // 同层文章（02）与根层文章同在树中；同层规则递归：文件夹内文章日期倒序（01 在 02 前）
  await expect(index.getByRole('link', { name: /pi agent 运行原理/ })).toBeVisible()
  await expect(index.getByRole('link', { name: /你好，世界/ })).toBeVisible()
  const nestedRows = index.locator('.post-tree-list .post-tree-list .post-row')
  await expect(nestedRows.first().locator('.post-row-title')).toHaveText('什么是 pi agent')
  await expect(nestedRows.nth(1).locator('.post-row-title')).toHaveText('pi agent 运行原理')

  // 客户端导航到根层文章：高亮跟随切换（分支保持用户展开状态），当前行在根层
  await index.getByRole('link', { name: /你好，世界/ }).click()
  await expect(page).toHaveURL(/\/posts\/hello-world/)
  const hello = index.getByRole('link', { name: /你好，世界/ })
  await expect(hello).toHaveClass(/nav-active/)
  await expect(hello).toHaveAttribute('aria-current', 'page')
  await expect(current).not.toHaveClass(/nav-active/)
})

/* ===== 移动端抽屉（issue #31）：窄屏侧栏收进覆盖式抽屉 ===== */

test('mobile drawer: <1024px 目录 button opens right TOC drawer with working scroll-spy; overlay/Esc/close dismiss (issue #31)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 800 })
  await page.goto('/posts/prerendered-blog-with-vite')

  // <1024px：「目录」按钮可见，「文章」按钮隐藏（768–1023px 左栏仍为两栏常驻侧栏）
  const tocTrigger = page.getByRole('button', { name: '目录' })
  await expect(tocTrigger).toBeVisible()
  await expect(page.getByRole('button', { name: '文章', exact: true })).toHaveCount(0)
  // 桌面右栏整栏隐藏（功能收进抽屉）
  await expect(page.locator('.post-toc')).toBeHidden()

  // 点击「目录」→ 右侧抽屉滑出；内容复用桌面目录组件（同一导航语义）
  await tocTrigger.click()
  const dialog = page.getByRole('dialog', { name: '文章目录' })
  await expect(dialog).toBeVisible()
  const drawerToc = dialog.getByRole('navigation', { name: '文章目录' })
  await expect(drawerToc).toBeVisible()
  await expect(drawerToc.getByRole('link', { name: '渲染策略：构建期一次性渲染' })).toBeVisible()

  // 打开时锁定正文滚动；焦点移入抽屉（关闭按钮）；触发按钮标记打开状态
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden')
  await expect(page.getByRole('button', { name: '关闭' })).toBeFocused()
  await expect(tocTrigger).toHaveAttribute('aria-expanded', 'true')

  // Esc 收起：抽屉卸载、滚动还原、焦点归还触发按钮
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')
  await expect(tocTrigger).toBeFocused()

  // 抽屉内 scroll-spy 与桌面一致：先滚动到「踩过的坑」位于观察带，再打开抽屉 → 该项高亮
  // （用 el.click() 打开避免 Playwright 自动滚动回触发按钮、破坏滚动位置）
  await page.evaluate(() => {
    const heading = document.getElementById('踩过的坑') as HTMLElement
    const y = heading.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.35
    window.scrollTo({ top: y, behavior: 'instant' })
  })
  await tocTrigger.evaluate((el) => (el as HTMLElement).click())
  await expect(dialog).toBeVisible()
  await expect(drawerToc.getByRole('link', { name: '踩过的坑' })).toHaveClass(/post-toc-active/)

  // 遮罩点击收起
  await page.locator('.drawer-overlay').click({ position: { x: 20, y: 400 } })
  await expect(dialog).toHaveCount(0)

  // 关闭按钮收起（焦点归还）
  await tocTrigger.click()
  await expect(dialog).toBeVisible()
  await page.getByRole('button', { name: '关闭' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(tocTrigger).toBeFocused()
})

test('mobile drawer: <768px 文章 button opens left index drawer with the same hierarchy tree; current article highlighted (issue #44)', async ({
  page,
}) => {
  // 期望值从内容源计算（与内容清单同一契约：非 draft 文章、日期倒序）；
  // 树中可见文章（issue #45）：被 showSubdirs:false 隐藏的子目录文章不在树中
  const published = publishedPosts()
  const visible = treeVisiblePosts()
  const rootPosts = visible.filter((post) => expectedDirectory(post.slug) === '')

  await page.setViewportSize({ width: 600, height: 800 })
  await page.goto('/posts/prerendered-blog-with-vite')

  // <768px：两个按钮都可见；桌面左栏整栏隐藏（功能收进抽屉）
  await expect(page.getByRole('button', { name: '目录' })).toBeVisible()
  const indexTrigger = page.getByRole('button', { name: '文章', exact: true })
  await expect(indexTrigger).toBeVisible()
  await expect(page.getByRole('navigation', { name: '文章索引' })).toBeHidden()

  // 点击「文章」→ 左侧抽屉滑出；内容复用桌面左栏组件（同一层级树，当前文章高亮 + aria-current）
  await indexTrigger.click()
  const dialog = page.getByRole('dialog', { name: '文章索引' })
  await expect(dialog).toBeVisible()
  const drawerIndex = dialog.getByRole('navigation', { name: '文章索引' })
  await expect(drawerIndex).toBeVisible()

  // 抽屉内容 = 同一层级树：根层文件夹（字母序）+ 根层文章（数量/顺序与内容源一致）
  const dirs = [
    ...new Set(
      published
        .map((post) => expectedDirectory(post.slug))
        .filter((d) => d !== '' && !d.includes('/')),
    ),
  ].sort()
  await expect(drawerIndex.locator('.post-tree-folder')).toHaveCount(dirs.length)
  await expect(drawerIndex.locator('.post-row')).toHaveCount(rootPosts.length)
  await expect(drawerIndex.locator('.post-row-date').first()).toHaveText(rootPosts[0]?.date ?? '')

  const current = drawerIndex.getByRole('link', {
    name: /用 React \+ Vite 搭一个构建期预渲染的静态博客/,
  })
  await expect(current).toHaveClass(/nav-active/)
  await expect(current).toHaveAttribute('aria-current', 'page')

  // 抽屉内文件夹同样可折叠可展开（行为与桌面一致）：全部展开后嵌套文章出现、点击可跳转
  for (const folder of await drawerIndex.locator('.post-tree-folder').all()) {
    await folder.click()
  }
  await expect(drawerIndex.locator('.post-tree-folder').first()).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(drawerIndex.locator('.post-row')).toHaveCount(visible.length)
  await drawerIndex.getByRole('link', { name: '什么是 pi agent' }).click()
  await expect(page).toHaveURL(/\/posts\/pi-agent\/01/)
})

test('desktop ≥1024px: drawer buttons hidden (no Tab insertion), sidebars persistent (issue #31)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/posts/prerendered-blog-with-vite')

  // 按钮整条隐藏：display:none → 不进可访问性树、不占 Tab 序
  await expect(page.getByRole('button', { name: '目录' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '文章', exact: true })).toHaveCount(0)
  await expect(page.locator('.post-drawer-bar')).toBeHidden()

  // 侧栏常驻：左索引 + 右目录均可见
  await expect(page.getByRole('navigation', { name: '文章索引' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: '文章目录' })).toBeVisible()

  // Tab 顺序无变化：文章 → 关于 → 主题 → GitHub → RSS → 左栏第一项（文件夹按钮；无抽屉按钮插队）
  const nav = page.locator('.site-nav')
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab')
  await expect(nav.getByRole('link', { name: 'GitHub' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(nav.getByRole('link', { name: 'RSS' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('navigation', { name: '文章索引' }).locator('.post-tree-folder').first(),
  ).toBeFocused()
})

test('mobile drawer: body scroll locked while open, restored after close (issue #31)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 600, height: 800 })
  await page.goto('/posts/hello-world')

  // 正文初始可滚动（html 无锁定）
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')

  // 打开「目录」抽屉：正文滚动锁定——滚轮 / PageDown 均无法滚动正文
  await page.getByRole('button', { name: '目录' }).click()
  await expect(page.getByRole('dialog', { name: '文章目录' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden')
  await page.mouse.wheel(0, 500)
  await page.keyboard.press('PageDown')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)

  // 关闭（Esc）后还原：滚动解锁，滚轮可正常滚动
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '文章目录' })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')
  await page.mouse.wheel(0, 500)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

  // 另一侧抽屉同样锁定/还原
  await page.getByRole('button', { name: '文章', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '文章索引' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden')
  const lockedAt = await page.evaluate(() => window.scrollY)
  await page.mouse.wheel(0, 800)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(lockedAt)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '文章索引' })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')
})

test('mobile drawer: no slide-in animation under prefers-reduced-motion (issue #31)', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 600, height: 800 })
  await page.goto('/posts/prerendered-blog-with-vite')

  await page.getByRole('button', { name: '目录' }).click()
  const panel = page.locator('.drawer-panel')
  await expect(panel).toBeVisible()
  // 无滑入/淡入动画（瞬时出现）
  expect(await panel.evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
  expect(
    await page.locator('.drawer-overlay').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none')
})

test('homepage renders no drawer buttons; 375px article drawer works with no horizontal overflow (issue #31)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')

  // 首页不渲染抽屉按钮（仅文章页渲染）
  await expect(page.getByRole('button', { name: '目录' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '文章', exact: true })).toHaveCount(0)
  await expect(page.locator('.post-drawer-bar')).toHaveCount(0)

  // 文章页 375px：按钮可见、抽屉可开、打开时无横向滚动
  await page.goto('/posts/prerendered-blog-with-vite')
  await expect(page.getByRole('button', { name: '目录' })).toBeVisible()
  await page.getByRole('button', { name: '目录' }).click()
  await expect(page.getByRole('dialog', { name: '文章目录' })).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
})

/* ===== 目录配置（issue #45）：defineDirConfig + showSubdirs ===== */

test('dir config: showSubdirs:false 的目录只显示该层文章、不显示子文件夹抽屉（issue #45）', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/posts/archive/notes')
  const index = page.getByRole('navigation', { name: '文章索引' })
  await expect(index).toBeVisible()

  // archive/config.ts 配置 showSubdirs: false：当前分支自动展开后，
  // archive 层只显示该层文章（日期倒序），子文件夹抽屉不出现
  const archive = index.getByRole('button', { name: /archive\// })
  await expect(archive).toHaveAttribute('aria-expanded', 'true')
  await expect(index.getByRole('link', { name: /归档笔记一/ })).toBeVisible()
  await expect(index.getByRole('link', { name: /归档笔记二/ })).toBeVisible()
  // 子文件夹抽屉被隐藏：private 不在树中、其文章不可从侧栏到达（内容未被删除）
  await expect(index.locator('.post-tree-folder').filter({ hasText: 'private' })).toHaveCount(0)
  await expect(index.getByRole('link', { name: /私密归档/ })).toHaveCount(0)

  // 配置仅影响该层、互不继承：pi-agent 层无配置 → 抽屉照常；根层文件夹不受 archive 影响
  await expect(index.getByRole('button', { name: /pi-agent\// })).toBeVisible()
  await expect(index.getByRole('link', { name: /你好，世界/ })).toBeVisible()
})

test('dir config: 被隐藏子目录的文章仍可经 URL 与上一篇/下一篇访问（issue #45）', async ({
  page,
  request,
}) => {
  // 直达 URL：预渲染 200 + 正文在源码（内容不被隐藏丢失）
  const response = await request.get('/posts/archive/private/secret')
  expect(response.status()).toBe(200)
  expect(await response.text()).toContain('私密归档正文')

  // 上一篇/下一篇：同目录相邻契约在隐藏目录内同样成立（private 内 2 篇：secret → deep）
  const secret = expectedNeighbors('archive/private/secret')
  expect(secret.newer).toBeUndefined()
  expect(secret.older?.slug).toBe('archive/private/deep')
  await page.goto('/posts/archive/private/secret')
  await expect(page.getByRole('link', { name: /上一篇/ })).toHaveCount(0)
  const next = page.getByRole('link', { name: /下一篇/ })
  await expect(next).toHaveAttribute('href', '/posts/archive/private/deep')
  await next.click()
  await expect(page).toHaveURL(/\/posts\/archive\/private\/deep/)
  await expect(page.getByRole('link', { name: /上一篇/ })).toHaveAttribute(
    'href',
    '/posts/archive/private/secret',
  )
  await expect(page.getByRole('link', { name: /下一篇/ })).toHaveCount(0)
})

test('dir config: 配置文件为非 .md 文件，不进文章清单与 SEO 产物（issue #45）', async ({
  request,
}) => {
  // 首页清单 / sitemap / feed 均不含配置文件的痕迹
  const home = await (await request.get('/')).text()
  expect(home).not.toContain('config.ts')
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).not.toContain('config.ts')
  const feed = await (await request.get('/feed.xml')).text()
  expect(feed).not.toContain('config.ts')
})
