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
    `<meta name="twitter:card" content="summary" />`,
    ...(meta.jsonLd ? [`<script type="application/ld+json">${meta.jsonLd}</script>`] : []),
  ].join('\n    ')
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
    head: renderHead({ title: siteName, description: tagline, canonical: '/', ogType: 'website' }),
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
