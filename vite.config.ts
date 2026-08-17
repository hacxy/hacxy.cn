import type { BlogConfig } from './src/define'

import react from '@vitejs/plugin-react'
import { build as esbuild } from 'esbuild'
import fs from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

import { blogPlugin } from './src/plugin'

async function loadBlogConfig(root: string): Promise<BlogConfig> {
  const tsPath = path.join(root, 'blog.config.ts')
  const jsPath = path.join(root, 'blog.config.js')
  const configPath = fs.existsSync(tsPath) ? tsPath : jsPath

  const result = await esbuild({
    entryPoints: [configPath],
    bundle: true,
    format: 'cjs',
    write: false,
    platform: 'node',
  })

  const code = result.outputFiles[0].text
  const mod: { exports: { default?: BlogConfig } } = { exports: {} }
  const fn = new Function('module', 'exports', 'require', '__dirname', '__filename', code)
  fn(mod, mod.exports, createRequire(fileURLToPath(import.meta.url)), root, configPath)
  return mod.exports.default ?? (mod.exports as unknown as BlogConfig)
}

export default defineConfig(async () => {
  const root = process.cwd()
  const config = await loadBlogConfig(root)
  return {
    plugins: [react(), blogPlugin(config)],
    resolve: { dedupe: ['react', 'react-dom'] },
    build: { outDir: 'dist', emptyOutDir: true },
  }
})
