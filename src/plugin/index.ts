import type { Plugin, ViteDevServer } from 'vite'
import type { BlogConfig } from '../define'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { createRequire } from 'module'
import { execSync } from 'child_process'
import fg from 'fast-glob'
import { build as esbuild } from 'esbuild'
import { parseFrontmatter } from '../utils/frontmatter'
import type { FrontmatterData } from '../utils/frontmatter'

const VIRTUAL_CONFIG = 'virtual:blog-config'
const VIRTUAL_POSTS = 'virtual:blog-posts'
const VIRTUAL_PROJECTS = 'virtual:github-projects'
const VIRTUAL_PAGES = 'virtual:blog-pages'

const RESOLVED_CONFIG = '\0' + VIRTUAL_CONFIG
const RESOLVED_POSTS = '\0' + VIRTUAL_POSTS
const RESOLVED_PROJECTS = '\0' + VIRTUAL_PROJECTS
const RESOLVED_PAGES = '\0' + VIRTUAL_PAGES

const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.git/**',
  '**/.claude/**',
  '**/index.md',
]

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildInlineHtml(title: string) {
  return `<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
}

function extractH1(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

function extractDescription(content: string, maxLen = 160): string {
  // 去掉 frontmatter 后，取第一段非标题、非代码块的纯文字
  const cleaned = content
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#+\s.*/gm, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim()
  const firstPara = cleaned.split(/\n\n+/).find(p => p.trim().length > 20) ?? ''
  const text = firstPara.replace(/\s+/g, ' ').trim()
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text
}

function injectSeoMeta(html: string, meta: { title: string; description: string; url: string }): string {
  const { title, description, url } = meta
  const escaped = {
    title: escapeHtml(title),
    description: escapeHtml(description),
    url: escapeHtml(url),
  }
  const tags = [
    `<title>${escaped.title}</title>`,
    `<meta name="description" content="${escaped.description}" />`,
    `<meta property="og:title" content="${escaped.title}" />`,
    `<meta property="og:description" content="${escaped.description}" />`,
    `<meta property="og:url" content="${escaped.url}" />`,
    `<meta property="og:type" content="article" />`,
    `<link rel="canonical" href="${escaped.url}" />`,
  ].join('\n    ')

  // 替换 <title> 并注入 meta（保留原有 title 标签位置）
  return html
    .replace(/<title>[^<]*<\/title>/, tags)
}

function parseDate(raw: string | Date | undefined): string | null {
  if (!raw) return null
  if (raw instanceof Date) return raw.toISOString().slice(0, 10)
  if (typeof raw === 'string') return raw.slice(0, 10)
  return null
}

function getGitDate(absPath: string): string | null {
  try {
    const out = execSync(`git log -1 --format="%ci" -- "${absPath}"`, { encoding: 'utf-8' }).trim()
    return out ? out.slice(0, 10) : null
  } catch {
    return null
  }
}

function filePathToSlug(filePath: string, contentDir: string): string {
  return filePath
    .replace(contentDir + '/', '')
    .replace(/\.md$/, '')
    .replace(/\/index$/, '')
}

function buildPagesData(contentDir: string): string {
  const files = fg.sync('*.md', { cwd: contentDir, absolute: true })
  const pages: Record<string, FrontmatterData[]> = {}
  for (const absPath of files) {
    const raw = fs.readFileSync(absPath, 'utf-8')
    const { data } = parseFrontmatter(raw)
    const layout = data.layout as string | undefined
    if (!layout) continue
    if (!pages[layout]) pages[layout] = []
    pages[layout].push(data)
  }
  return `export default ${JSON.stringify(pages)}`
}

function getPageFiles(contentDir: string): string[] {
  const files = fg.sync('*.md', { cwd: contentDir, absolute: true })
  const pageFiles: string[] = []
  for (const absPath of files) {
    const raw = fs.readFileSync(absPath, 'utf-8')
    const { data } = parseFrontmatter(raw)
    if (data.layout) pageFiles.push(absPath)
  }
  return pageFiles
}

interface ResolvedSidebarItem {
  text: string
  link?: string
  items?: ResolvedSidebarItem[]
  isolated?: boolean
}

function readDirMeta(dir: string): { title?: string; sort?: number; exclude?: string[]; isolated?: boolean; series?: string } {
  const indexPath = path.join(dir, 'index.md')
  if (!fs.existsSync(indexPath)) return {}
  const raw = fs.readFileSync(indexPath, 'utf-8')
  const { data } = parseFrontmatter(raw)
  return {
    title: data.title as string | undefined,
    sort: typeof data.sort === 'number' ? data.sort : undefined,
    exclude: Array.isArray(data.exclude) ? data.exclude.map(String) : undefined,
    isolated: data.isolated === true ? true : undefined,
    series: typeof data.series === 'string' ? data.series : undefined,
  }
}

function scanDirForSidebar(
  dir: string,
  contentDir: string,
  exclude: string[],
): ResolvedSidebarItem[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const dirMeta = readDirMeta(dir)
  const localExclude = new Set(dirMeta.exclude ?? [])
  const dirItems: { item: ResolvedSidebarItem; sort: number }[] = []
  const fileItems: { item: ResolvedSidebarItem; sort: number; date: string | null }[] = []

  for (const entry of entries) {
    const absPath = path.join(dir, entry.name)
    const relPath = path.relative(contentDir, absPath)

    if (localExclude.has(entry.name)) continue

    if (exclude.some(pattern => {
      const p = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '.*')
        .replace(/(?<!\.)\*/g, '[^/]*')
      return new RegExp(`^${p}$`).test(relPath)
    })) continue

    if (entry.isDirectory()) {
      const children = scanDirForSidebar(absPath, contentDir, exclude)
      if (children.length > 0) {
        const meta = readDirMeta(absPath)
        const item: ResolvedSidebarItem = { text: meta.title ?? entry.name, items: children }
        if (meta.isolated) item.isolated = true
        dirItems.push({ item, sort: meta.sort ?? Infinity })
      }
    } else if (entry.name.endsWith('.md') && entry.name !== 'index.md') {
      const raw = fs.readFileSync(absPath, 'utf-8')
      const { data, content } = parseFrontmatter(raw)
      if (data.layout) continue
      const fileName = path.basename(absPath, '.md')
      const title = (data.title as string | undefined) || extractH1(content) || fileName
      const slug = filePathToSlug(absPath, contentDir)
      const sort = typeof data.sort === 'number' ? data.sort : Infinity
      const date = parseDate(data.date as string | Date | undefined) ?? getGitDate(absPath)
      fileItems.push({ item: { text: title, link: `/${slug}` }, sort, date })
    }
  }

  dirItems.sort((a, b) => a.sort - b.sort)

  fileItems.sort((a, b) => {
    if (a.sort !== b.sort) return a.sort - b.sort
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return b.date.localeCompare(a.date)
  })

  return [...dirItems.map(d => d.item), ...fileItems.map(f => f.item)]
}

function buildSidebar(contentDir: string, config: BlogConfig): ResolvedSidebarItem[] {
  const exclude = [...DEFAULT_EXCLUDE, ...(config.exclude ?? [])]
  return scanDirForSidebar(contentDir, contentDir, exclude)
}

function buildPostsData(contentDir: string, config: BlogConfig): string {
  const include = config.include ?? ['**/*.md']
  const exclude = [...DEFAULT_EXCLUDE, ...(config.exclude ?? [])]

  const files = fg.sync(include, {
    cwd: contentDir,
    ignore: exclude,
    absolute: true,
  })

  const pageFileSet = new Set(getPageFiles(contentDir))

  const posts = files
    .filter(absPath => !pageFileSet.has(absPath))
    .map(absPath => {
      const rawContent = fs.readFileSync(absPath, 'utf-8')
      const { data, content } = parseFrontmatter(rawContent)
      const slug = filePathToSlug(absPath, contentDir)
      const fileName = path.basename(absPath, '.md')
      const title = (data.title as string | undefined) || extractH1(content) || fileName
      const date = parseDate(data.date as string | Date | undefined) ?? getGitDate(absPath) ?? null
      const tags: string[] = Array.isArray(data.tags) ? data.tags.map(String) : []
      const dirMeta = readDirMeta(path.dirname(absPath))
      const series = dirMeta.series ?? null
      return { slug, title, date, tags, series, rawContent }
    })

  return `export default ${JSON.stringify(posts)}`
}

function readHomeFrontmatter(contentDir: string): { github?: string; projects?: string[] } {
  const homePath = path.join(contentDir, 'index.md')
  if (!fs.existsSync(homePath)) return {}
  try {
    const { data } = parseFrontmatter(fs.readFileSync(homePath, 'utf-8'))
    return {
      github:   typeof data.github === 'string' ? data.github : undefined,
      projects: Array.isArray(data.projects) ? (data.projects as string[]) : undefined,
    }
  } catch {
    return {}
  }
}

async function fetchGithubProject(github: string, name: string) {
  const username = github.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '')
  try {
    const headers: Record<string, string> = { 'User-Agent': 'hacxy-blog-build' }
    if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
    const res = await fetch(`https://api.github.com/repos/${username}/${name}`, { headers })
    if (!res.ok) throw new Error(`GitHub API ${res.status}`)
    const data = await res.json() as { description: string; stargazers_count: number; html_url: string }
    return {
      name,
      description: data.description ?? '',
      stars: data.stargazers_count ?? 0,
      url: data.html_url,
    }
  } catch (e) {
    console.warn(`[blog] failed to fetch github project ${name}:`, e)
    return { name, description: '', stars: 0, url: `https://github.com/${username}/${name}` }
  }
}

export function blogPlugin(userConfig: BlogConfig): Plugin {
  let root = process.cwd()
  let resolvedContentDir = path.resolve(root, userConfig.contentDir ?? '.')
  let devServer: ViteDevServer | undefined
  let resolvedConfig: BlogConfig = userConfig

  async function reloadBlogConfig(configFile: string) {
    try {
      const result = await esbuild({
        entryPoints: [configFile],
        bundle: true,
        format: 'cjs',
        write: false,
        platform: 'node',
        logLevel: 'silent',
      })
      const code = result.outputFiles[0].text
      const mod: { exports: { default?: BlogConfig } } = { exports: {} }
      const fn = new Function('module', 'exports', 'require', '__dirname', '__filename', code)
      fn(mod, mod.exports, createRequire(pathToFileURL(configFile).href), path.dirname(configFile), configFile)
      const loaded = mod.exports.default ?? (mod.exports as unknown as BlogConfig)
      if (loaded) {
        resolvedConfig = loaded
        resolvedContentDir = path.resolve(root, loaded.contentDir ?? '.')
      }
    } catch (e) {
      console.warn('[blog] failed to reload blog.config:', e)
    }
  }

  return {
    name: '@hacxy/blog',

    configResolved(config) {
      root = config.root
      resolvedContentDir = path.resolve(root, userConfig.contentDir ?? '.')
    },

    configureServer(server) {
      devServer = server

      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '/'
        const accept = req.headers.accept ?? ''
        const isNavigation =
          req.method === 'GET' &&
          accept.includes('text/html') &&
          !url.startsWith('/@') &&
          !url.startsWith('/__') &&
          !url.match(/\.\w{1,8}(\?.*)?$/)

        if (isNavigation) {
          const html = await server.transformIndexHtml(url, buildInlineHtml(resolvedConfig.title ?? 'Blog'))
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(html)
          return
        }
        next()
      })

      const watcher = server.watcher
      watcher.add(path.join(resolvedContentDir, '**/*.md'))
      const configTs = path.join(root, 'blog.config.ts')
      const configJs = path.join(root, 'blog.config.js')
      watcher.add(configTs)
      watcher.add(configJs)
      watcher.on('add', invalidateAll)
      watcher.on('unlink', invalidateAll)
      watcher.on('change', (file) => {
        if (file.endsWith('.md')) {
          invalidateAll()
          if (path.dirname(file) === resolvedContentDir) invalidatePages()
        }
        if (file === configTs || file === configJs) {
          reloadBlogConfig(file).then(() => {
            const mod = server.moduleGraph.getModuleById(RESOLVED_CONFIG)
            if (mod) server.moduleGraph.invalidateModule(mod)
            server.hot.send({ type: 'full-reload' })
          })
        }
      })
    },

    resolveId(id) {
      if (id === VIRTUAL_CONFIG) return RESOLVED_CONFIG
      if (id === VIRTUAL_POSTS) return RESOLVED_POSTS
      if (id === VIRTUAL_PROJECTS) return RESOLVED_PROJECTS
      if (id === VIRTUAL_PAGES) return RESOLVED_PAGES
    },

    async load(id) {
      if (id === RESOLVED_CONFIG) {
        const resolved = {
          author: resolvedConfig.author,
          title: resolvedConfig.title ?? 'Blog',
          logo: resolvedConfig.logo ?? null,
          bio: resolvedConfig.bio ?? '',
          copyright: resolvedConfig.copyright ?? '',
          techStack: resolvedConfig.techStack ?? [],
          nav: resolvedConfig.nav ?? [],
          sidebar: buildSidebar(resolvedContentDir, resolvedConfig),
          include: resolvedConfig.include ?? ['**/*.md'],
          exclude: resolvedConfig.exclude ?? [],
          base: resolvedConfig.base ?? '/',
        }
        return `export default ${JSON.stringify(resolved)}`
      }

      if (id === RESOLVED_PAGES) {
        return buildPagesData(resolvedContentDir)
      }

      if (id === RESOLVED_POSTS) {
        return buildPostsData(resolvedContentDir, resolvedConfig)
      }

      if (id === RESOLVED_PROJECTS) {
        const { github, projects } = readHomeFrontmatter(resolvedContentDir)
        if (!github || !projects?.length) {
          return `export default []`
        }
        const fetched = await Promise.all(
          projects.map(name => fetchGithubProject(github, name))
        )
        return `export default ${JSON.stringify(fetched)}`
      }
    },

    async closeBundle() {
      const distDir = path.resolve(root, 'dist')
      if (!fs.existsSync(distDir)) return

      const siteUrl = (resolvedConfig.siteUrl ?? '').replace(/\/$/, '')
      const siteTitle = resolvedConfig.title ?? 'Blog'
      const include = resolvedConfig.include ?? ['**/*.md']
      const exclude = [...DEFAULT_EXCLUDE, ...(resolvedConfig.exclude ?? [])]

      // 收集所有文章
      const files = fg.sync(include, { cwd: resolvedContentDir, ignore: exclude, absolute: true })
      const pageFileSet = new Set(getPageFiles(resolvedContentDir))
      const posts = files
        .filter(f => !pageFileSet.has(f))
        .map(absPath => {
          const raw = fs.readFileSync(absPath, 'utf-8')
          const { data, content } = parseFrontmatter(raw)
          const slug = filePathToSlug(absPath, resolvedContentDir)
          const fileName = path.basename(absPath, '.md')
          const title = (data.title as string | undefined) || extractH1(content) || fileName
          const summary = (data.summary as string | undefined) ?? extractDescription(content)
          const date = parseDate(data.date as string | Date | undefined) ?? getGitDate(absPath) ?? null
          return { slug, title, summary, date }
        })

      // 读取构建产物 index.html
      const templateHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8')

      // 为每篇文章生成预渲染 HTML
      for (const post of posts) {
        const url = `${siteUrl}/${post.slug}`
        const html = injectSeoMeta(templateHtml, {
          title: `${post.title} | ${siteTitle}`,
          description: post.summary ?? '',
          url,
        })
        const outDir = path.join(distDir, post.slug)
        fs.mkdirSync(outDir, { recursive: true })
        fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8')
      }

      // 静态页面
      const staticPages = [
        { path: '', title: siteTitle, description: resolvedConfig.bio ?? '' },
        { path: 'posts', title: `Blog | ${siteTitle}`, description: '所有文章' },
        { path: 'tags', title: `Tags | ${siteTitle}`, description: '标签' },
        { path: 'about', title: `About | ${siteTitle}`, description: '' },
      ]
      for (const page of staticPages) {
        const url = page.path ? `${siteUrl}/${page.path}` : siteUrl
        const html = injectSeoMeta(templateHtml, { title: page.title, description: page.description, url })
        if (page.path) {
          const outDir = path.join(distDir, page.path)
          fs.mkdirSync(outDir, { recursive: true })
          fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8')
        } else {
          fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf-8')
        }
      }

      // 生成 sitemap.xml
      if (siteUrl) {
        const now = new Date().toISOString().slice(0, 10)
        const urls = [
          `  <url><loc>${siteUrl}/</loc><lastmod>${now}</lastmod></url>`,
          `  <url><loc>${siteUrl}/posts</loc><lastmod>${now}</lastmod></url>`,
          `  <url><loc>${siteUrl}/tags</loc><lastmod>${now}</lastmod></url>`,
          ...posts.map(p =>
            `  <url><loc>${siteUrl}/${p.slug}</loc>${p.date ? `<lastmod>${p.date}</lastmod>` : ''}</url>`
          ),
        ]
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
        fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap, 'utf-8')
        console.log(`[blog] sitemap.xml generated with ${posts.length + 3} URLs`)
      }
    },
  }

  function invalidateAll() {
    if (!devServer) return
    const posts = devServer.moduleGraph.getModuleById(RESOLVED_POSTS)
    if (posts) devServer.moduleGraph.invalidateModule(posts)
    const config = devServer.moduleGraph.getModuleById(RESOLVED_CONFIG)
    if (config) devServer.moduleGraph.invalidateModule(config)
    devServer.hot.send({ type: 'full-reload' })
  }

  function invalidatePages() {
    if (!devServer) return
    const mod = devServer.moduleGraph.getModuleById(RESOLVED_PAGES)
    if (mod) devServer.moduleGraph.invalidateModule(mod)
    devServer.hot.send({ type: 'full-reload' })
  }
}
