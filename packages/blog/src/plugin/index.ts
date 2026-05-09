import type { Plugin, ViteDevServer, Rollup } from 'vite'
import type { BlogConfig } from '../define'
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createRequire } from 'module'
import { execSync } from 'child_process'
import yaml from 'js-yaml'
import fg from 'fast-glob'
import { build as esbuild } from 'esbuild'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// resolve framework src directory regardless of whether we're running from dist/ or src/
const FRAMEWORK_SRC = path.resolve(__dirname, '../../src')

const VIRTUAL_CONFIG = 'virtual:blog-config'
const VIRTUAL_POSTS = 'virtual:blog-posts'
const VIRTUAL_PROJECTS = 'virtual:github-projects'
const VIRTUAL_ENTRY = 'virtual:blog-entry'
const VIRTUAL_HOME = 'virtual:blog-home'

const RESOLVED_CONFIG = '\0' + VIRTUAL_CONFIG
const RESOLVED_POSTS = '\0' + VIRTUAL_POSTS
const RESOLVED_PROJECTS = '\0' + VIRTUAL_PROJECTS
const RESOLVED_ENTRY = '\0' + VIRTUAL_ENTRY
const RESOLVED_HOME = '\0' + VIRTUAL_HOME

const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.git/**',
  '**/.claude/**',
  'index.md',
]

function buildInlineHtml(title: string) {
  return `<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/@id/__x00__virtual:blog-entry"></script>
  </body>
</html>`
}

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

function buildHomeData(root: string): string {
  const indexPath = path.join(root, 'index.md')
  if (!fs.existsSync(indexPath)) {
    return `export default null`
  }
  const raw = fs.readFileSync(indexPath, 'utf-8')
  const { data } = parseFrontmatter(raw)
  return `export default ${JSON.stringify(data)}`
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
      if (loaded) resolvedConfig = loaded
    } catch (e) {
      console.warn('[blog] failed to reload blog.config:', e)
    }
  }

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
          const html = await server.transformIndexHtml(url, buildInlineHtml(resolvedConfig.title ?? 'Blog'))
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(html)
          return
        }
        next()
      })

      // watch for md file changes → invalidate virtual:blog-posts
      const watcher = server.watcher
      watcher.add(path.join(root, '**/*.md'))
      // explicitly watch blog.config so changes are detected
      const configTs = path.join(root, 'blog.config.ts')
      const configJs = path.join(root, 'blog.config.js')
      watcher.add(configTs)
      watcher.add(configJs)
      watcher.on('add', invalidatePosts)
      watcher.on('unlink', invalidatePosts)
      watcher.on('change', (file) => {
        if (file.endsWith('.md')) invalidatePosts()
        if (file === path.join(root, 'index.md')) invalidateHome()
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
      if (id === VIRTUAL_ENTRY) return RESOLVED_ENTRY
      if (id === VIRTUAL_HOME) return RESOLVED_HOME
    },

    async load(id) {
      if (id === RESOLVED_CONFIG) {
        const resolved = {
          author: resolvedConfig.author,
          title: resolvedConfig.title ?? 'Blog',
          logo: resolvedConfig.logo ?? null,
          github: resolvedConfig.github ?? '',
          bio: resolvedConfig.bio ?? '',
          email: resolvedConfig.email ?? '',
          bilibili: resolvedConfig.bilibili ?? '',
          copyright: resolvedConfig.copyright ?? '',
          projects: resolvedConfig.projects ?? [],
          techStack: resolvedConfig.techStack ?? [],
          include: resolvedConfig.include ?? ['**/*.md'],
          exclude: resolvedConfig.exclude ?? [],
          base: resolvedConfig.base ?? '/',
        }
        return `export default ${JSON.stringify(resolved)}`
      }

      if (id === RESOLVED_HOME) {
        return buildHomeData(root)
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
      type ViteChunk = Rollup.OutputChunk & { viteMetadata?: { importedCss: Set<string> } }
      const entryChunk = Object.values(bundle).find(
        (chunk): chunk is ViteChunk =>
          chunk.type === 'chunk' && chunk.isEntry
      ) as ViteChunk | undefined
      const entryFile = entryChunk?.fileName ?? 'assets/app.js'
      const cssFiles = [...(entryChunk?.viteMetadata?.importedCss ?? [])]
      const cssLinks = cssFiles
        .map(f => `    <link rel="stylesheet" crossorigin href="/${f}">`)
        .join('\n')

      const html = `<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
${cssLinks ? cssLinks + '\n' : ''}    <title>${userConfig.title ?? 'Blog'}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" crossorigin src="/${entryFile}"></script>
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

  function invalidateHome() {
    if (!devServer) return
    const mod = devServer.moduleGraph.getModuleById(RESOLVED_HOME)
    if (mod) devServer.moduleGraph.invalidateModule(mod)
    devServer.ws.send({ type: 'full-reload' })
  }
}
