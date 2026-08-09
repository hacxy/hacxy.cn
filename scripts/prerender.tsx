import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'

import { AppRoutes } from '../src/App.tsx'

// 构建期预渲染：对每个路由执行 renderToString（StaticRouter 与客户端
// BrowserRouter 同为声明式路由，输出可水合），把渲染结果注入 dist/index.html
// 模板的 <div id="root">，产出纯静态 HTML（PRD「构建时预渲染」决策）。
// 输出布局：/<route> 同时产出 <route>.html 与 <route>/index.html，适配
// vite preview（/<route> → <route>.html）与常规静态服务器（目录 index）。

// 预渲染路由清单：url = 渲染位置，out = 相对 dist 的输出文件
const routes = [
  { url: '/', out: ['index.html'] },
  { url: '/about', out: ['about.html', 'about/index.html'] },
]

// 404 兜底：渲染任意未知路径命中 catch-all 路由，产出 404.html
const notFoundRoute = { url: '/__not-found__', out: ['404.html'] }

// 本文件经 SSR 构建后位于 dist/ssr/prerender.js（源码在 scripts/），
// 相对项目根均为两层，故取 dirname 的上级两级
const rootDir = join(import.meta.dirname, '..', '..')
const distDir = join(rootDir, 'dist')

const template = readFileSync(join(distDir, 'index.html'), 'utf8')

for (const { url, out } of [...routes, notFoundRoute]) {
  const appHtml = renderToString(
    <StaticRouter location={url}>
      <AppRoutes />
    </StaticRouter>,
  )
  const html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
  for (const outPath of out) {
    const filePath = join(distDir, outPath)
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, html)
  }
}
