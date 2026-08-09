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
  it('parses frontmatter fields and renders markdown to html', () => {
    const post = parseMarkdown(fixtureRaw, 'hello-world')

    expect(post.slug).toBe('hello-world')
    expect(post.title).toBe('你好，世界')
    expect(post.date).toBe('2026-08-10')
    expect(post.description).toBe('第一篇测试文章')
    expect(post.tags).toEqual(['hello', 'world'])
    expect(post.draft).toBe(false)
    expect(post.html).toContain('<h1>标题</h1>')
    expect(post.html).toContain('<p>一段正文。</p>')
  })

  it('defaults missing title to slug and other fields to empty values', () => {
    const post = parseMarkdown('---\ndate: 2026-08-01\n---\n\n正文', 'no-title')

    expect(post.title).toBe('no-title')
    expect(post.description).toBe('')
    expect(post.tags).toEqual([])
    expect(post.draft).toBe(false)
    expect(post.updated).toBeUndefined()
  })

  it('normalizes date parsed as a Date object to YYYY-MM-DD', () => {
    const post = parseMarkdown('---\ntitle: 日期\ndate: 2026-08-05\n---\n\n正文', 'date-object')

    expect(post.date).toBe('2026-08-05')
  })

  it('throws when date is missing', () => {
    expect(() => parseMarkdown('---\ntitle: 无日期\n---\n\n正文', 'no-date')).toThrow(/date/)
  })

  it('throws when date is invalid', () => {
    expect(() => parseMarkdown('---\ntitle: 坏日期\ndate: 明天\n---\n\n正文', 'bad-date')).toThrow(
      /date/,
    )
  })

  it('renders GFM tables and task lists', () => {
    const raw = `---\ntitle: GFM\ndate: 2026-08-02\n---\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n- [x] 已完成\n- [ ] 未完成`

    const post = parseMarkdown(raw, 'gfm')

    expect(post.html).toContain('<table>')
    expect(post.html).toContain('<input type="checkbox" checked disabled>')
    expect(post.html).toContain('<input type="checkbox" disabled>')
  })
})

describe('loadPosts', () => {
  it('sorts posts by date descending (newest first)', () => {
    const sources = [
      { slug: 'old', raw: '---\ndate: 2026-01-01\n---\n\n旧' },
      { slug: 'new', raw: '---\ndate: 2026-08-10\n---\n\n新' },
      { slug: 'mid', raw: '---\ndate: 2026-05-05\n---\n\n中' },
    ]

    const posts = loadPosts(sources)

    expect(posts.map((post) => post.slug)).toEqual(['new', 'mid', 'old'])
  })

  it('filters out draft posts', () => {
    const sources = [
      { slug: 'published', raw: '---\ndate: 2026-08-10\n---\n\n已发布' },
      { slug: 'draft', raw: '---\ndate: 2026-08-09\ndraft: true\n---\n\n草稿' },
    ]

    const posts = loadPosts(sources)

    expect(posts.map((post) => post.slug)).toEqual(['published'])
  })

  it('returns an empty array for empty sources', () => {
    expect(loadPosts([])).toEqual([])
  })
})

describe('content manifest', () => {
  it('aggregates the fixture post with newest-first ordering', () => {
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
})
