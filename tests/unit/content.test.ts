import { describe, expect, it } from 'vitest'

import { loadPosts } from '../../src/content/loadPosts.ts'
import { parseMarkdown } from '../../src/content/parseMarkdown.ts'
import { posts } from '../../src/content/posts.ts'

const fixtureRaw = `---
title: 你好，世界
date: 2026-08-10
description: 第一篇测试文章
tags: [hello, world]
draft: false
---

# 标题

一段正文。
`

describe('parseMarkdown', () => {
  it('parses frontmatter fields and renders markdown to html', async () => {
    const post = await parseMarkdown(fixtureRaw, 'hello-world')

    expect(post.slug).toBe('hello-world')
    expect(post.title).toBe('你好，世界')
    expect(post.date).toBe('2026-08-10')
    expect(post.description).toBe('第一篇测试文章')
    expect(post.tags).toEqual(['hello', 'world'])
    expect(post.draft).toBe(false)
    expect(post.html).toContain('<h1 id="标题">标题</h1>')
    expect(post.html).toContain('<p>一段正文。</p>')
  })

  it('defaults missing title to slug and other fields to empty values', async () => {
    const post = await parseMarkdown('---\ndate: 2026-08-01\n---\n\n正文', 'no-title')

    expect(post.title).toBe('no-title')
    expect(post.description).toBe('')
    expect(post.tags).toEqual([])
    expect(post.draft).toBe(false)
    expect(post.updated).toBeUndefined()
  })

  it('normalizes date parsed as a Date object to YYYY-MM-DD', async () => {
    const post = await parseMarkdown(
      '---\ntitle: 日期\ndate: 2026-08-05\n---\n\n正文',
      'date-object',
    )

    expect(post.date).toBe('2026-08-05')
  })

  it('throws when date is missing', async () => {
    await expect(() => parseMarkdown('---\ntitle: 无日期\n---\n\n正文', 'no-date')).rejects.toThrow(
      /date/,
    )
  })

  it('throws when date is invalid', async () => {
    await expect(() =>
      parseMarkdown('---\ntitle: 坏日期\ndate: 明天\n---\n\n正文', 'bad-date'),
    ).rejects.toThrow(/date/)
  })

  it('renders GFM tables and task lists', async () => {
    const raw = `---\ntitle: GFM\ndate: 2026-08-02\n---\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n- [x] 已完成\n- [ ] 未完成`

    const post = await parseMarkdown(raw, 'gfm')

    expect(post.html).toContain('<table>')
    expect(post.html).toContain('<input type="checkbox" checked disabled>')
    expect(post.html).toContain('<input type="checkbox" disabled>')
  })
})

describe('parseMarkdown: code highlighting (shiki dual themes)', () => {
  it('renders code blocks with shiki dual themes and keeps the language marker', async () => {
    const post = await parseMarkdown(
      '---\ntitle: 代码\ndate: 2026-08-01\n---\n\n```ts\nconst x: number = 1\n```',
      'code',
    )

    expect(post.html).toContain('<pre class="shiki')
    expect(post.html).toContain('shiki-themes')
    // 双主题：亮色内联 + 暗色 CSS 变量，暗色模式无需重新生成 HTML
    expect(post.html).toContain('--shiki-dark')
    expect(post.html).toContain('language-ts')
  })

  it('leaves code blocks without a language untouched', async () => {
    const post = await parseMarkdown(
      '---\ntitle: 代码\ndate: 2026-08-01\n---\n\n```\nplain text\n```',
      'plain',
    )

    expect(post.html).not.toContain('shiki')
    expect(post.html).toContain('<pre><code>plain text')
  })

  it('falls back to plain text for unknown languages without failing the build', async () => {
    const post = await parseMarkdown(
      '---\ntitle: 代码\ndate: 2026-08-01\n---\n\n```foobar\nwhatever\n```',
      'unknown-lang',
    )

    expect(post.html).not.toContain('shiki')
    expect(post.html).toContain('whatever')
  })
})

describe('parseMarkdown: heading anchors', () => {
  it('adds github-style anchor ids to headings', async () => {
    const post = await parseMarkdown(
      '---\ntitle: 锚点\ndate: 2026-08-01\n---\n\n## 小节 One\n\n### 子节 two!\n\n## 小节 One\n',
      'anchors',
    )

    expect(post.html).toContain('<h2 id="小节-one">')
    expect(post.html).toContain('<h3 id="子节-two">')
    // 重复标题自动去重，保证锚点 id 唯一
    expect(post.html).toContain('<h2 id="小节-one-1">')
  })
})

describe('parseMarkdown: image references', () => {
  it('rewrites relative assets/ img srcs to absolute /assets/ paths', async () => {
    const post = await parseMarkdown(
      `---\ntitle: 图片\ndate: 2026-08-01\n---\n\n![示意图](assets/diagram.png)\n\n![点前缀](./assets/icon.svg)\n\n![绝对路径](/images/x.png)\n\n![外链](https://example.com/a.png)\n`,
      'images',
    )

    // 文章同目录 assets/ 引用重写为站点绝对路径（构建期完成，与页面 URL 解耦）
    expect(post.html).toContain('src="/assets/diagram.png"')
    expect(post.html).toContain('src="/assets/icon.svg"')
    // 绝对路径与外链原样保留
    expect(post.html).toContain('src="/images/x.png"')
    expect(post.html).toContain('src="https://example.com/a.png"')
  })
})

describe('parseMarkdown: toc extraction', () => {
  it('extracts h2/h3 headings with anchor ids in document order', async () => {
    const post = await parseMarkdown(
      `---\ntitle: 目录\ndate: 2026-08-01\n---\n\n## 第一节\n\n### 子节 A\n\n正文\n\n## 第二节\n\n#### 不入目录\n`,
      'toc',
    )

    // 仅 h2/h3；id 与标题锚点一致；按文档顺序
    expect(post.toc).toEqual([
      { id: '第一节', text: '第一节', level: 2 },
      { id: '子节-a', text: '子节 A', level: 3 },
      { id: '第二节', text: '第二节', level: 2 },
    ])
  })

  it('returns an empty toc for documents without h2/h3', async () => {
    const post = await parseMarkdown(
      '---\ntitle: 无目录\ndate: 2026-08-01\n---\n\n只有一段文字。',
      'no-toc',
    )

    expect(post.toc).toEqual([])
  })
})

describe('loadPosts', () => {
  it('sorts posts by date descending (newest first)', async () => {
    const sources = [
      { slug: 'old', raw: '---\ndate: 2026-01-01\n---\n\n旧' },
      { slug: 'new', raw: '---\ndate: 2026-08-10\n---\n\n新' },
      { slug: 'mid', raw: '---\ndate: 2026-05-05\n---\n\n中' },
    ]

    const posts = await loadPosts(sources)

    expect(posts.map((post) => post.slug)).toEqual(['new', 'mid', 'old'])
  })

  it('filters out draft posts', async () => {
    const sources = [
      { slug: 'published', raw: '---\ndate: 2026-08-10\n---\n\n已发布' },
      { slug: 'draft', raw: '---\ndate: 2026-08-09\ndraft: true\n---\n\n草稿' },
    ]

    const posts = await loadPosts(sources)

    expect(posts.map((post) => post.slug)).toEqual(['published'])
  })

  it('includes drafts when includeDrafts is enabled (dev preview)', async () => {
    const sources = [
      { slug: 'published', raw: '---\ndate: 2026-08-10\n---\n\n已发布' },
      { slug: 'draft', raw: '---\ndate: 2026-08-09\ndraft: true\n---\n\n草稿' },
    ]

    const posts = await loadPosts(sources, { includeDrafts: true })

    expect(posts.map((post) => post.slug)).toEqual(['published', 'draft'])
    expect(posts.find((post) => post.slug === 'draft')?.draft).toBe(true)
  })

  it('returns an empty array for empty sources', async () => {
    expect(await loadPosts([])).toEqual([])
  })
})

describe('content manifest', () => {
  it('aggregates fixture posts with newest-first ordering', async () => {
    expect(posts.length).toBeGreaterThan(0)

    const hello = posts.find((post) => post.slug === 'hello-world')
    expect(hello).toBeDefined()
    expect(hello?.title).toBe('你好，世界')
    expect(hello?.date).toBe('2026-08-10')

    for (let i = 1; i < posts.length; i++) {
      const prev = posts[i - 1]
      const current = posts[i]
      if (prev && current) {
        expect(prev.date >= current.date).toBe(true)
      }
    }
  })

  it('includes draft posts in non-production mode (dev/test preview)', () => {
    // vitest 的 mode 为 test（≠ production），等同 dev：插件注入含 draft 的清单；
    // production 构建时插件排除 draft（见 E2E「draft posts are excluded」）
    const draft = posts.find((post) => post.slug === 'draft-post')
    expect(draft).toBeDefined()
    expect(draft?.draft).toBe(true)
  })
})
