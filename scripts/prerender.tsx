import type { Post } from '../src/content/types.ts'

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'

import { AppRoutes } from '../src/App.tsx'
import { posts } from '../src/content/posts.ts'
import { siteName, siteUrl, tagline } from '../src/site.ts'

// 构建期预渲染：对每个路由执行 renderToString（StaticRouter 与客户端
// BrowserRouter 同为声明式路由，输出可水合），把渲染结果注入 dist/index.html
// 模板的 <div id="root">，产出纯静态 HTML（PRD「构建时预渲染」决策）。
// 输出布局：/<route> 同时产出 <route>.html 与 <route>/index.html，适配
// vite preview（/<route> → <route>.html）与常规静态服务器（目录 index）。
// 每页 head（title / canonical / OG / JSON-LD）在此一并注入——爬虫不执行 JS
// 也能读到完整元数据（PRD 用户故事 20-23）。

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

interface HeadMeta {
  title: string
  description: string
  /** 站点相对路径，如 /posts/hello-world */
  canonical: string
  ogType: 'website' | 'article'
  /** OG 图相对路径（构建期生成，见 renderOgImage） */
  ogImage?: string
  jsonLd?: string
}

/** 渲染 head 注入内容（不含 <title>，title 单独替换模板默认值） */
function renderHead(meta: HeadMeta): string {
  const url = `${siteUrl}${meta.canonical}`
  return [
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${meta.ogType}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    ...(meta.ogImage ? [`<meta property="og:image" content="${siteUrl}${meta.ogImage}" />`] : []),
    `<meta name="twitter:card" content="summary" />`,
    ...(meta.jsonLd ? [`<script type="application/ld+json">${meta.jsonLd}</script>`] : []),
  ].join('\n    ')
}

/** 把标题按字符数折成最多 3 行（模板图排版用） */
function wrapTitle(title: string, maxChars = 20): string[] {
  const chars = [...title]
  const lines: string[] = []
  let current = ''
  for (const ch of chars) {
    if (current.length >= maxChars) {
      lines.push(current)
      current = ch
    } else {
      current += ch
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, 3)
}

/**
 * 极客风 OG 图模板（issue #17：黑白灰阶）——近黑底 + 白色强调竖条 +
 * mono 站点名/标题，1200x630，构建期生成 SVG。
 * 注：SVG 文本由爬虫端按字体栈渲染，PNG 栅格化留作后续优化。
 */
function renderOgImage(siteLabel: string, title: string): string {
  const titleLines = wrapTitle(title)
  const lineHeight = 60
  const startY = 330 - ((titleLines.length - 1) * lineHeight) / 2
  const titleText = titleLines
    .map(
      (line, i) =>
        `    <text x="96" y="${startY + i * lineHeight}" font-family="JetBrains Mono, monospace" font-size="52" fill="#e6e6e6">${escapeXml(line)}</text>`,
    )
    .join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#111111"/>
  <rect x="64" y="0" width="4" height="630" fill="#ffffff"/>
  <text x="96" y="120" font-family="JetBrains Mono, monospace" font-size="32" fill="#ffffff">${escapeXml(siteLabel)}</text>
${titleText}
  <text x="96" y="560" font-family="JetBrains Mono, monospace" font-size="24" fill="#8c8c8c">${escapeXml(siteUrl)}</text>
</svg>
`
}

/** JSON-LD Article 结构化数据（仅文章页） */
function renderArticleJsonLd(post: Post): string {
  const url = `${siteUrl}/posts/${post.slug}`
  return JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      ...(post.updated ? { dateModified: post.updated } : {}),
      url,
      author: { '@type': 'Person', name: siteName },
      mainEntityOfPage: url,
    },
    null,
    2,
  )
}

interface Route {
  url: string
  title: string
  out: string[]
  head: string
}

const routes: Route[] = [
  {
    url: '/',
    title: siteName,
    out: ['index.html'],
    head: renderHead({
      title: siteName,
      description: tagline,
      canonical: '/',
      ogType: 'website',
      ogImage: '/og/home.svg',
    }),
  },
  {
    url: '/about',
    title: `关于 · ${siteName}`,
    out: ['about.html', 'about/index.html'],
    head: renderHead({
      title: `关于 · ${siteName}`,
      description: tagline,
      canonical: '/about',
      ogType: 'website',
    }),
  },
  ...posts.map((post) => ({
    url: `/posts/${post.slug}`,
    title: `${post.title} · ${siteName}`,
    out: [`posts/${post.slug}.html`, `posts/${post.slug}/index.html`],
    head: renderHead({
      title: `${post.title} · ${siteName}`,
      description: post.description || tagline,
      canonical: `/posts/${post.slug}`,
      ogType: 'article',
      ogImage: `/og/posts/${post.slug}.svg`,
      jsonLd: renderArticleJsonLd(post),
    }),
  })),
]

// 404 兜底：渲染任意未知路径命中 catch-all 路由，产出 404.html
const notFoundRoute = { url: '/__not-found__', out: ['404.html'] }

// 本文件经 SSR 构建后位于 dist/ssr/prerender.js（源码在 scripts/），
// 相对项目根均为两层，故取 dirname 的上级两级
const rootDir = join(import.meta.dirname, '..', '..')
const distDir = join(rootDir, 'dist')

const template = readFileSync(join(distDir, 'index.html'), 'utf8')

for (const { url, title, out, head } of routes) {
  const appHtml = renderToString(
    <StaticRouter location={url}>
      <AppRoutes />
    </StaticRouter>,
  )
  const html = template
    .replace('<title>Hacxy</title>', `<title>${escapeHtml(title)}</title>`)
    .replace('<!--app-head-->', head)
    .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
  for (const outPath of out) {
    const filePath = join(distDir, outPath)
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, html)
  }
}

// 404 兜底：保持模板默认 head（站点名标题），仅注入渲染结果
const notFoundHtml = renderToString(
  <StaticRouter location={notFoundRoute.url}>
    <AppRoutes />
  </StaticRouter>,
)
writeFileSync(
  join(distDir, '404.html'),
  template.replace('<div id="root"></div>', `<div id="root">${notFoundHtml}</div>`),
)

// sitemap.xml：/posts/*（非 draft，来自内容清单）+ /about + /，绝对地址
const sitemapUrls = ['/', '/about', ...posts.map((post) => `/posts/${post.slug}`)]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((path) => `  <url>\n    <loc>${siteUrl}${path}</loc>\n  </url>`).join('\n')}
</urlset>
`
writeFileSync(join(distDir, 'sitemap.xml'), sitemap)

// robots.txt：允许全站抓取，并声明 sitemap
const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`
writeFileSync(join(distDir, 'robots.txt'), robots)

// feed.xml：RSS 2.0，条目含全文（content:encoded）+ 正确标题/日期/链接；
// draft 已由内容清单过滤，不进入 feed（PRD 用户故事 24/25）
function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** YYYY-MM-DD → RFC 2822（RSS pubDate，UTC） */
function toRfc2822(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year as number, (month as number) - 1, day as number))
    .toUTCString()
    .replace('GMT', '+0000')
}

const feedItems = posts
  .map(
    (post) => `  <item>
    <title>${escapeXml(post.title)}</title>
    <link>${siteUrl}/posts/${post.slug}</link>
    <guid isPermaLink="true">${siteUrl}/posts/${post.slug}</guid>
    <pubDate>${toRfc2822(post.date)}</pubDate>
    <description>${escapeXml(post.description)}</description>
    <content:encoded><![CDATA[${post.html}]]></content:encoded>
  </item>`,
  )
  .join('\n')

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${siteUrl}/</link>
    <description>${escapeXml(tagline)}</description>
    <language>zh-CN</language>
${feedItems}
  </channel>
</rss>
`
writeFileSync(join(distDir, 'feed.xml'), feed)

// 极客风 OG 图模板：首页 + 每篇非 draft 文章各生成一张（黑白灰阶 + mono + 标题）
const ogDir = join(distDir, 'og', 'posts')
mkdirSync(ogDir, { recursive: true })
writeFileSync(join(distDir, 'og', 'home.svg'), renderOgImage(siteName, tagline))
for (const post of posts) {
  // 嵌套 slug（如 pi-agent/01）：OG 图路径为 /og/posts/<slug>.svg，需递归建目录
  const ogFile = join(ogDir, `${post.slug}.svg`)
  mkdirSync(dirname(ogFile), { recursive: true })
  writeFileSync(ogFile, renderOgImage(siteName, post.title))
}
