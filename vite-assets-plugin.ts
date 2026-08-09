import type { Plugin } from 'vite'

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { createReadStream } from 'node:fs'
import { extname, join } from 'node:path'

// 文章同目录 assets/：content/posts/assets/。dev 挂载到 /assets，构建期复制进产物。
const ASSETS_DIR = join(process.cwd(), 'content', 'posts', 'assets')

const MIME: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

/**
 * 文章图片资源插件（PRD 用户故事 9「图片放文章同目录 assets/」）：
 * - dev：中间件把 content/posts/assets 挂到 /assets（与构建期 URL 一致）
 * - build：closeBundle 把 assets/* 复制到 dist/assets/，配合管线中
 *   assets/ → /assets/ 的引用重写，图片在产物中可访问
 */
export function postAssetsPlugin(): Plugin {
  return {
    name: 'post-assets',
    configureServer(server) {
      server.middlewares.use('/assets', (req, res, next) => {
        const name = decodeURIComponent((req.url ?? '').split('?')[0] ?? '')
        const file = join(ASSETS_DIR, name)
        // 防路径穿越（join 解析 ..）：文件必须在 ASSETS_DIR 内且为非目录
        const isFile = file.startsWith(ASSETS_DIR) && statSyncSafe(file)
        if (!name || !isFile) {
          return next()
        }
        res.setHeader(
          'Content-Type',
          MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
        )
        createReadStream(file).pipe(res)
      })
    },
    closeBundle() {
      if (!existsSync(ASSETS_DIR)) return
      const outDir = join(process.cwd(), 'dist', 'assets')
      mkdirSync(outDir, { recursive: true })
      for (const file of readdirSync(ASSETS_DIR)) {
        const src = join(ASSETS_DIR, file)
        if (statSync(src).isFile()) {
          copyFileSync(src, join(outDir, file))
        }
      }
    },
  }
}

function statSyncSafe(file: string): boolean {
  try {
    return existsSync(file) && !statSync(file).isDirectory()
  } catch {
    return false
  }
}
