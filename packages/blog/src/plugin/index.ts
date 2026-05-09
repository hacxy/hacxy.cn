import type { Plugin, ViteDevServer, Rollup } from 'vite'
import type { BlogConfig } from '../define'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import yaml from 'js-yaml'
import fg from 'fast-glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// resolve framework src directory regardless of whether we're running from dist/ or src/
const FRAMEWORK_SRC = path.resolve(__dirname, '../../src')

const VIRTUAL_CONFIG = 'virtual:blog-config'
const VIRTUAL_POSTS = 'virtual:blog-posts'
const VIRTUAL_PROJECTS = 'virtual:github-projects'
const VIRTUAL_ENTRY = 'virtual:blog-entry'

const RESOLVED_CONFIG = '\0' + VIRTUAL_CONFIG
const RESOLVED_POSTS = '\0' + VIRTUAL_POSTS
const RESOLVED_PROJECTS = '\0' + VIRTUAL_PROJECTS
const RESOLVED_ENTRY = '\0' + VIRTUAL_ENTRY

const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.git/**',
  '**/.claude/**',
]

const INLINE_HTML = `<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Blog</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/@id/__x00__virtual:blog-entry"></script>
  </body>
</html>`

interface FrontmatterData {
  title?: string
  date?: string | Date
  tags?: unknown[]
  summary?: string
  [key: string]: unknown
}

const FM_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

function parseFrontmatter(raw: string): { data: FrontmatterData; content: string } {
  const match = raw.match(FM_PATTERN)
  if (!match) return { data: {}, content: raw }
  const data = (yaml.load(match[1]) ?? {}) as FrontmatterData
  const content = raw.slice(match[0].length)
  return { data, content }
}

function extractH1(content: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : 'Untitled'
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

function filePathToSlug(filePath: string, root: string): string {
  return filePath
    .replace(root + '/', '')
    .replace(/\.md$/, '')
    .replace(/\/index$/, '')
}

function buildPostsData(root: string, config: BlogConfig): string {
  const include = config.include ?? ['**/*.md']
  const exclude = [...DEFAULT_EXCLUDE, ...(config.exclude ?? [])]

  const files = fg.sync(include, {
    cwd: root,
    ignore: exclude,
    absolute: true,
  })

  const posts = files.map(absPath => {
    const rawContent = fs.readFileSync(absPath, 'utf-8')
    const { data, content } = parseFrontmatter(rawContent)
    const title = (data.title as string | undefined) || extractH1(content)
    const date = parseDate(data.date as string | Date | undefined) ?? getGitDate(absPath) ?? null
    const tags: string[] = Array.isArray(data.tags) ? data.tags.map(String) : []
    const slug = filePathToSlug(absPath, root)
    return { slug, title, date, tags, rawContent }
  })

  return `export default ${JSON.stringify(posts)}`
}

async function fetchGithubProject(github: string, name: string) {
  try {
    const headers: Record<string, string> = { 'User-Agent': 'hacxy-blog-build' }
    if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
    const res = await fetch(`https://api.github.com/repos/${github}/${name}`, { headers })
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
    return { name, description: '', stars: 0, url: `https://github.com/${github}/${name}` }
  }
}

export function blogPlugin(userConfig: BlogConfig): Plugin {
  let root = process.cwd()
  let devServer: ViteDevServer | undefined

  return {
    name: '@hacxy/blog',

    config(_, env) {
      if (env.command === 'build') {
        return {
          build: {
            rollupOptions: {
              input: { app: VIRTUAL_ENTRY },
            },
          },
        }
      }
    },

    configResolved(config) {
      root = config.root
    },

    configureServer(server) {
      devServer = server

      // serve inline HTML for browser navigation requests (SPA fallback)
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
          const html = await server.transformIndexHtml(url, INLINE_HTML)
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(html)
          return
        }
        next()
      })

      // watch for md file changes → invalidate virtual:blog-posts
      const watcher = server.watcher
      watcher.add(path.join(root, '**/*.md'))
      watcher.on('add', invalidatePosts)
      watcher.on('unlink', invalidatePosts)
      watcher.on('change', (file) => {
        if (file.endsWith('.md')) invalidatePosts()
      })
    },

    resolveId(id) {
      if (id === VIRTUAL_CONFIG) return RESOLVED_CONFIG
      if (id === VIRTUAL_POSTS) return RESOLVED_POSTS
      if (id === VIRTUAL_PROJECTS) return RESOLVED_PROJECTS
      if (id === VIRTUAL_ENTRY) return RESOLVED_ENTRY
    },

    async load(id) {
      if (id === RESOLVED_CONFIG) {
        const resolved = {
          author: userConfig.author,
          github: userConfig.github ?? '',
          bio: userConfig.bio ?? '',
          email: userConfig.email ?? '',
          bilibili: userConfig.bilibili ?? '',
          copyright: userConfig.copyright ?? '',
          projects: userConfig.projects ?? [],
          techStack: userConfig.techStack ?? [],
          include: userConfig.include ?? ['**/*.md'],
          exclude: userConfig.exclude ?? [],
          base: userConfig.base ?? '/',
        }
        return `export default ${JSON.stringify(resolved)}`
      }

      if (id === RESOLVED_POSTS) {
        return buildPostsData(root, userConfig)
      }

      if (id === RESOLVED_PROJECTS) {
        if (!userConfig.github || !userConfig.projects?.length) {
          return `export default []`
        }
        const projects = await Promise.all(
          userConfig.projects.map(name => fetchGithubProject(userConfig.github!, name))
        )
        return `export default ${JSON.stringify(projects)}`
      }

      if (id === RESOLVED_ENTRY) {
        const createPath = path.join(FRAMEWORK_SRC, 'create.tsx')
        return `import { createBlog } from ${JSON.stringify(createPath)}; createBlog()`
      }
    },

    generateBundle(_, bundle) {
      // find the entry chunk to get hashed filename
      const entryChunk = Object.values(bundle).find(
        (chunk): chunk is Rollup.OutputChunk =>
          chunk.type === 'chunk' && chunk.isEntry
      )
      const entryFile = entryChunk?.fileName ?? 'assets/app.js'

      const html = `<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${userConfig.author ?? 'Blog'}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${entryFile}"></script>
  </body>
</html>`
      this.emitFile({
        type: 'asset',
        fileName: 'index.html',
        source: html,
      })
    },
  }

  function invalidatePosts() {
    if (!devServer) return
    const mod = devServer.moduleGraph.getModuleById(RESOLVED_POSTS)
    if (mod) devServer.moduleGraph.invalidateModule(mod)
    devServer.ws.send({ type: 'full-reload' })
  }
}
