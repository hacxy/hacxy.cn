import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

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

export default defineConfig({
  plugins: [react(), gitDatesPlugin()],
})
