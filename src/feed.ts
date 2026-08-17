import type { Post } from './content/types.ts'

/**
 * 共享 feed 生成模块（issue #79）：生产构建（scripts/prerender）与
 * dev 中间件（vite-feed-plugin）共用同一实现，保证两处 feed 格式一致。
 * 纯函数、无副作用；草稿过滤由调用方负责（loadPosts includeDrafts: false）。
 */

/** XML 特殊字符转义（& 必须最先替换，避免二次转义） */
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

/**
 * 生成 RSS 2.0 feed：channel 元信息 + 全文条目（content:encoded）。
 * baseUrl 不带尾斜杠（生产 = siteUrl，dev = 当前 origin），
 * 条目链接为 baseUrl/posts/<slug>。
 */
export function generateFeed(
  posts: Post[],
  baseUrl: string,
  channelTitle: string,
  channelDescription: string,
): string {
  const feedItems = posts
    .map(
      (post) => `  <item>
    <title>${escapeXml(post.title)}</title>
    <link>${baseUrl}/posts/${post.slug}</link>
    <guid isPermaLink="true">${baseUrl}/posts/${post.slug}</guid>
    <pubDate>${toRfc2822(post.date)}</pubDate>
    <description>${escapeXml(post.description)}</description>
    <content:encoded><![CDATA[${post.html}]]></content:encoded>
  </item>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${baseUrl}/</link>
    <description>${escapeXml(channelDescription)}</description>
    <language>zh-CN</language>
${feedItems}
  </channel>
</rss>
`
}
