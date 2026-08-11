import type { Plugin } from 'vite'

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { createReadStream } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'

// 文章资源根：content/posts。文章同目录 assets/ 目录按目录路径提供：
// 根层 content/posts/assets/ → /assets/，嵌套 content/posts/<目录>/assets/ → /assets/<目录>/
const POSTS_ROOT = join(process.cwd(), 'content', 'posts')

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
 * 文章资源 URL 路径 → 磁盘文件（issue #43）：/assets/<path> 的 <path> 部分映射到
 * content/posts/<目录>/assets/<文件名>——根层文章（无目录）→ content/posts/assets/，
 * 嵌套文章按所在目录路径化（如 pi-agent/x.png → content/posts/pi-agent/assets/x.png）。
 * 防路径穿越：join 规范化后解析结果必须仍在 content/posts 内，否则返回 null。
 * dev 中间件与构建产物共用这一映射契约（URL 与产物路径一一对应）。
 */
export function resolveAssetFile(name: string): string | null {
  const file = join(POSTS_ROOT, dirname(name), 'assets', basename(name))
  return file.startsWith(POSTS_ROOT) ? file : null
}

/**
 * 文章图片资源插件（PRD 用户故事 9「图片放文章同目录 assets/」）：
 * - dev：中间件把 content/posts 下全部 assets/ 目录挂到 /assets/<目录路径>/
 *   （根层 = /assets/，嵌套 = /assets/<目录>/，与构建期 URL 一致）
 * - build：closeBundle 递归把各 assets/ 目录按相对目录路径复制到 dist/assets/，
 *   配合管线中 assets/ → /assets/<目录路径>/ 的引用重写，图片在产物中可访问，
 *   不同目录同名图片互不撞车
 */
export function postAssetsPlugin(): Plugin {
  return {
    name: 'post-assets',
    configureServer(server) {
      server.middlewares.use('/assets', (req, res, next) => {
        const name = decodeURIComponent((req.url ?? '').split('?')[0] ?? '')
        const file = resolveAssetFile(name)
        // 防路径穿越（resolveAssetFile 拒绝 posts 根外路径）+ 必须为非目录文件
        const isFile = !!file && statSyncSafe(file)
        if (!name || !file || !isFile) {
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
      if (!existsSync(POSTS_ROOT)) return
      const outDir = join(process.cwd(), 'dist', 'assets')
      // 递归收集 content/posts 下所有 assets/ 目录：根层 → dist/assets/，
      // 嵌套 → dist/assets/<相对目录路径>/（按目录路径复制，同名文件不撞车）
      const walk = (dir: string, prefix: string) => {
        for (const entry of readdirSync(dir)) {
          const full = join(dir, entry)
          if (!statSync(full).isDirectory()) continue
          if (entry === 'assets') {
            const target = join(outDir, prefix)
            mkdirSync(target, { recursive: true })
            for (const file of readdirSync(full)) {
              const src = join(full, file)
              if (statSync(src).isFile()) {
                copyFileSync(src, join(target, file))
              }
            }
          } else {
            walk(full, prefix ? `${prefix}/${entry}` : entry)
          }
        }
      }
      walk(POSTS_ROOT, '')
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
