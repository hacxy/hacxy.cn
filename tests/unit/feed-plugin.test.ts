import type { ServerResponse } from 'node:http'
import type { Connect } from 'vite'

import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { handleFeedRequest } from '../../vite-feed-plugin.ts'

const FEED_FIXTURE_DIR = join(process.cwd(), 'tests', 'fixtures', 'feed')

/**
 * issue #79：dev 模式真实 RSS 订阅源。本次唯一的新测试接缝——
 * mock req/res 直测 handleFeedRequest（HTTP 处理器），不启动 dev server。
 */

function mockReq(method: string, url: string): Connect.IncomingMessage {
  return { method, url, headers: { host: 'localhost:5173' } } as unknown as Connect.IncomingMessage
}

function mockRes() {
  const headers = new Map<string, string>()
  const res = {
    statusCode: 0,
    body: '',
    ended: false,
    setHeader(name: string, value: string) {
      headers.set(name, value)
    },
    getHeader(name: string) {
      return headers.get(name)
    },
    end(chunk?: unknown) {
      if (chunk !== undefined && chunk !== null) this.body = String(chunk)
      this.ended = true
    },
  }
  return res as unknown as ServerResponse & {
    body: string
    ended: boolean
    getHeader: (name: string) => string | undefined
  }
}

const HANDLER_OPTIONS = { baseUrl: 'http://localhost:5173', postsDir: FEED_FIXTURE_DIR }

describe('handleFeedRequest: GET /feed.xml → RSS 2.0 feed（mock req/res 直测）', () => {
  it('返回 200 + application/rss+xml; charset=utf-8，正文为 RSS 2.0 channel 结构', async () => {
    const res = mockRes()
    const handled = await handleFeedRequest(mockReq('GET', '/feed.xml'), res, HANDLER_OPTIONS)

    expect(handled).toBe(true)
    expect(res.statusCode).toBe(200)
    expect(res.getHeader('Content-Type')).toBe('application/rss+xml; charset=utf-8')
    expect(res.ended).toBe(true)

    const body = res.body
    expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(body).toContain(
      '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
    )
    expect(body).toContain('  <channel>')
    expect(body).toContain('<title>Hacxy</title>')
    expect(body).toContain('<link>http://localhost:5173/</link>')
    expect(body).toContain('<language>zh-CN</language>')
  })

  it('条目链接指向 base URL（dev 站点当前 origin）', async () => {
    const res = mockRes()
    await handleFeedRequest(mockReq('GET', '/feed.xml'), res, HANDLER_OPTIONS)

    expect(res.body).toContain('<link>http://localhost:5173/posts/published</link>')
    expect(res.body).toContain(
      '<guid isPermaLink="true">http://localhost:5173/posts/published</guid>',
    )
  })

  it('草稿文章不进入 feed', async () => {
    const res = mockRes()
    await handleFeedRequest(mockReq('GET', '/feed.xml'), res, HANDLER_OPTIONS)

    expect(res.body).not.toContain('草稿标题')
    expect(res.body).not.toContain('不应出现在 feed')
  })

  it('title/description 特殊字符正确转义（& < > "）', async () => {
    const res = mockRes()
    await handleFeedRequest(mockReq('GET', '/feed.xml'), res, HANDLER_OPTIONS)

    expect(res.body).toContain('<title>A &amp; B &lt;Tag&gt; &quot;Quote&quot;</title>')
    expect(res.body).toContain('<description>desc &amp; more &lt;info&gt;</description>')
  })

  it('正文全文进入 content:encoded CDATA，与生产格式一致', async () => {
    const res = mockRes()
    await handleFeedRequest(mockReq('GET', '/feed.xml'), res, HANDLER_OPTIONS)

    expect(res.body).toContain('<content:encoded><![CDATA[')
    expect(res.body).toContain(']]></content:encoded>')
    expect(res.body).toContain(
      '<p>正文包含 <strong>粗体</strong> 与 <code>inline code</code>。</p>',
    )
  })

  it('pubDate 为 RFC 2822（UTC +0000）', async () => {
    const res = mockRes()
    await handleFeedRequest(mockReq('GET', '/feed.xml'), res, HANDLER_OPTIONS)

    expect(res.body).toContain('<pubDate>Mon, 10 Aug 2026 00:00:00 +0000</pubDate>')
  })

  it('仅精确命中 GET /feed.xml：其他路径/方法不处理', async () => {
    const res = mockRes()
    expect(await handleFeedRequest(mockReq('GET', '/other'), res, HANDLER_OPTIONS)).toBe(false)
    expect(await handleFeedRequest(mockReq('GET', '/feed.xml/'), res, HANDLER_OPTIONS)).toBe(false)
    expect(await handleFeedRequest(mockReq('GET', '/feed.xmlish'), res, HANDLER_OPTIONS)).toBe(
      false,
    )
    expect(await handleFeedRequest(mockReq('POST', '/feed.xml'), res, HANDLER_OPTIONS)).toBe(false)
    expect(res.ended).toBe(false)
  })
})
