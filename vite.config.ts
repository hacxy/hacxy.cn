import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import siteConfig from './site.config'

function walkMd(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walkMd(full)
    if (entry.name.endsWith('.md')) return [full]
    return []
  })
}

function gitDatesPlugin(): Plugin {
  const virtualModuleId = 'virtual:git-dates'
  const resolvedId = '\0' + virtualModuleId

  return {
    name: 'vite-plugin-git-dates',
    resolveId(id) {
      if (id === virtualModuleId) return resolvedId
    },
    load(id) {
      if (id !== resolvedId) return
      const root = process.cwd()
      const postsDir = path.join(root, 'posts')
      const files = walkMd(postsDir)
      const dates: Record<string, string> = {}
      for (const absPath of files) {
        const key = '/' + path.relative(root, absPath).replace(/\\/g, '/')
        try {
          const out = execSync(`git log -1 --format="%ci" -- "${absPath}"`, { encoding: 'utf-8' }).trim()
          if (out) {
            dates[key] = out.slice(0, 10)
            continue
          }
        } catch { /* git not available or file untracked */ }
        // fallback: filesystem mtime
        try {
          dates[key] = fs.statSync(absPath).mtime.toISOString().slice(0, 10)
        } catch { /* ignore */ }
      }
      return `export default ${JSON.stringify(dates)}`
    },
  }
}

async function fetchGithubProject(name: string) {
  try {
    const headers: Record<string, string> = { 'User-Agent': 'hacxy-blog-build' }
    if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
    const res = await fetch(`https://api.github.com/repos/${siteConfig.github}/${name}`, { headers })
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`)
    const data = await res.json() as { description: string; stargazers_count: number; html_url: string }
    return {
      name,
      description: data.description ?? '',
      stars: data.stargazers_count ?? 0,
      url: data.html_url,
    }
  } catch (e) {
    console.warn(`[github-projects] failed to fetch ${name}:`, e)
    return { name, description: '', stars: 0, url: `https://github.com/${siteConfig.github}/${name}` }
  }
}

function githubProjectsPlugin(): Plugin {
  const virtualModuleId = 'virtual:github-projects'
  const resolvedId = '\0' + virtualModuleId
  return {
    name: 'vite-plugin-github-projects',
    resolveId(id) {
      if (id === virtualModuleId) return resolvedId
    },
    async load(id) {
      if (id !== resolvedId) return
      const projects = await Promise.all(siteConfig.projects.map(fetchGithubProject))
      return `export default ${JSON.stringify(projects)}`
    },
  }
}

export default defineConfig({
  plugins: [react(), gitDatesPlugin(), githubProjectsPlugin()],
})
