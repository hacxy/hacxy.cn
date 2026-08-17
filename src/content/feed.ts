import type { Post } from './types.ts'

/**
 * 共享 feed 生成模块（issue #77 prefactor）：RSS 2.0 订阅源（feed.xml）的
 * 组装逻辑——XML 转义 / RFC 2822 日期 / 频道与条目组装 / 草稿过滤——
 * 全部收敛为纯函数。预渲染脚本与 dev 订阅源（下游工单）共用同一实现，
 * dev 与生产共用同一草稿策略：草稿不进入 feed（renderFeed 是唯一过滤点）。
 */

/** XML 文本转义：& < > " 替换为实体（feed.xml 与 OG 图 SVG 共用） */
export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** YYYY-MM-DD → RFC 2822（RSS pubDate，UTC） */
export function toRfc2822(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year as number, (month as number) - 1, day as number))
    .toUTCString()
    .replace('GMT', '+0000')
}

/** feed 频道元信息（来自站点配置，调用方传入以便测试与 dev 复用） */
export interface FeedChannel {
  siteName: string
  siteUrl: string
  tagline: string
}

/** 组装 RSS 2.0 feed.xml：draft 过滤唯一执行点（草稿不进入 feed，dev 与生产共用） */
export function renderFeed(posts: Post[], channel: FeedChannel): string {
  const items = posts
    .filter((post) => !post.draft)
    .map(
      (post) => `  <item>
    <title>${escapeXml(post.title)}</title>
    <link>${channel.siteUrl}/posts/${post.slug}</link>
    <guid isPermaLink="true">${channel.siteUrl}/posts/${post.slug}</guid>
    <pubDate>${toRfc2822(post.date)}</pubDate>
    <description>${escapeXml(post.description)}</description>
    <content:encoded><![CDATA[${post.html}]]></content:encoded>
  </item>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(channel.siteName)}</title>
    <link>${channel.siteUrl}/</link>
    <description>${escapeXml(channel.tagline)}</description>
    <language>zh-CN</language>
${items}
  </channel>
</rss>
`
}
