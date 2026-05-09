import { createServer, build as viteBuild, type InlineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { blogPlugin } from '../plugin'
import type { BlogConfig } from '../define'
import { build as esbuild } from 'esbuild'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// resolve packages relative to the framework's own node_modules
const _require = createRequire(__filename)

function resolveFrameworkDep(name: string): string {
  try {
    return path.dirname(_require.resolve(`${name}/package.json`))
  } catch {
    return name
  }
}

async function loadBlogConfig(root: string): Promise<BlogConfig> {
  const tsPath = path.join(root, 'blog.config.ts')
  const jsPath = path.join(root, 'blog.config.js')

  let configPath: string
  if (fs.existsSync(tsPath)) {
    configPath = tsPath
  } else if (fs.existsSync(jsPath)) {
    configPath = jsPath
  } else {
    throw new Error('[blog] blog.config.ts not found in ' + root)
  }

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
  fn(mod, mod.exports, createRequire(configPath), path.dirname(configPath), configPath)
  const config = mod.exports.default ?? (mod.exports as unknown as BlogConfig)
  return config
}

function baseViteConfig(root: string): InlineConfig {
  const reactDir = resolveFrameworkDep('react')
  const reactDomDir = resolveFrameworkDep('react-dom')
  const reactMap: Record<string, string> = {
    react: `${reactDir}/index.js`,
    'react-dom': `${reactDomDir}/index.js`,
    'react-dom/client': `${reactDomDir}/client.js`,
    'react-dom/server': `${reactDomDir}/server.js`,
    'react/jsx-runtime': `${reactDir}/jsx-runtime.js`,
    'react/jsx-dev-runtime': `${reactDir}/jsx-dev-runtime.js`,
  }
  // resolve.alias must use exact-match regex, NOT plain strings.
  // Vite treats string find as a prefix: find:'react' would corrupt 'react-dom'
  // into '${reactDir}/index.jsdom'. Exact regex prevents this prefix collision.
  //
  // optimizeDeps.include lists all packages so Vite's dep optimizer pre-bundles
  // them as ESM via the aliases above (createOptimizeDepsIncludeResolver uses
  // vite:resolve which applies resolve.alias). Without this, react is served as
  // raw @fs CJS which the browser can't import.
  const alias = Object.entries(reactMap).map(([pkg, file]) => ({
    find: new RegExp('^' + pkg.replace(/\//g, '\\/') + '$'),
    replacement: file,
  }))
  return {
    root,
    configFile: false,
    resolve: { alias, dedupe: ['react', 'react-dom'] },
    optimizeDeps: { include: Object.keys(reactMap) },
  }
}

export async function run() {
  const [, , command] = process.argv
  const root = process.cwd()

  if (command === 'build') {
    const config = await loadBlogConfig(root)
    await viteBuild({
      ...baseViteConfig(root),
      plugins: [react(), blogPlugin(config)],
      build: {
        outDir: 'dist',
        emptyOutDir: true,
      },
    })
    console.log('[blog] build complete → dist/')
    return
  }

  // default: dev
  const config = await loadBlogConfig(root)
  const server = await createServer({
    ...baseViteConfig(root),
    plugins: [react(), blogPlugin(config)],
    server: { port: 5173 },
  })
  await server.listen()
  server.printUrls()
}
