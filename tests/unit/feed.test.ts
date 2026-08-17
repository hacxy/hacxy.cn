import type { Post } from '../../src/content/types.ts'

import { describe, expect, it } from 'vitest'

import { escapeXml, renderFeed, toRfc2822 } from '../../src/content/feed.ts'

/**
 * issue #77（prefactor）：feed.xml 组装逻辑抽为共享纯函数模块
 * （src/content/feed.ts）——XML 转义 / RFC 2822 日期 / 频道与条目组装 /
 * 草稿过滤全部收敛于此；预渲染脚本与后续 dev 订阅源共用同一实现，
 * dev 与生产共用同一草稿策略（草稿不进入 feed）。
 */

function post(overrides: Partial<Post>): Post {
  return {
    slug: 'hello',
    title: '你好，世界',
    date: '2026-08-10',
    description: '',
    tags: [],
    draft: false,
    html: '<p>正文</p>',
    toc: [],
    ...overrides,
  }
}

describe('escapeXml（feed 与 OG 图 SVG 共用）', () => {
  it('escapes & < > " to XML entities', () => {
    expect(escapeXml('a & b < c > d " e')).toBe('a &amp; b &lt; c &gt; d &quot; e')
  })

  it('leaves plain text and CJK untouched', () => {
    expect(escapeXml('了解真相，才能获得真正的自由')).toBe('了解真相，才能获得真正的自由')
  })
})

describe('toRfc2822（RSS pubDate，UTC）', () => {
  it('converts YYYY-MM-DD to RFC 2822 with +0000 offset', () => {
    expect(toRfc2822('2026-08-10')).toBe('Mon, 10 Aug 2026 00:00:00 +0000')
    expect(toRfc2822('2026-08-11')).toBe('Tue, 11 Aug 2026 00:00:00 +0000')
    expect(toRfc2822('2026-08-12')).toBe('Wed, 12 Aug 2026 00:00:00 +0000')
    expect(toRfc2822('2026-01-01')).toBe('Thu, 01 Jan 2026 00:00:00 +0000')
  })
})

describe('renderFeed（RSS 2.0 组装）', () => {
  const channel = { siteName: 'Hacxy', siteUrl: 'https://hacxy.cn', tagline: '副标题' }

  it('renders channel + item with full content and exact byte layout', () => {
    const feed = renderFeed(
      [post({ slug: 'hello', title: '你好，世界', date: '2026-08-10' })],
      channel,
    )
    expect(feed).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Hacxy</title>
    <link>https://hacxy.cn/</link>
    <description>副标题</description>
    <language>zh-CN</language>
  <item>
    <title>你好，世界</title>
    <link>https://hacxy.cn/posts/hello</link>
    <guid isPermaLink="true">https://hacxy.cn/posts/hello</guid>
    <pubDate>Mon, 10 Aug 2026 00:00:00 +0000</pubDate>
    <description></description>
    <content:encoded><![CDATA[<p>正文</p>]]></content:encoded>
  </item>
  </channel>
</rss>
`)
  })

  it('escapes XML special chars in title/description', () => {
    const feed = renderFeed(
      [
        post({
          title: 'a < b & "c" > d',
          description: '说明 <code>x</code> & more',
        }),
      ],
      channel,
    )
    expect(feed).toContain('<title>a &lt; b &amp; &quot;c&quot; &gt; d</title>')
    expect(feed).toContain('<description>说明 &lt;code&gt;x&lt;/code&gt; &amp; more</description>')
  })

  it('filters drafts: draft posts never enter the feed', () => {
    const feed = renderFeed(
      [
        post({ slug: 'published', title: '正式文章' }),
        post({ slug: 'draft', title: '草稿', draft: true }),
      ],
      channel,
    )
    expect(feed).toContain('https://hacxy.cn/posts/published')
    expect(feed).not.toContain('draft')
    expect(feed).not.toContain('草稿')
  })

  it('keeps caller-provided order (no hidden sorting)', () => {
    const feed = renderFeed(
      [post({ slug: 'second', date: '2026-08-01' }), post({ slug: 'first', date: '2026-08-10' })],
      channel,
    )
    const second = feed.indexOf('posts/second')
    const first = feed.indexOf('posts/first')
    expect(second).toBeGreaterThan(-1)
    expect(first).toBeGreaterThan(second)
  })
})
