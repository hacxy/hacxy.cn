import type { PostSource } from './types.ts'

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/**
 * 递归收集目录下全部 .md 文件（绝对路径，任意深度）。
 * 非 .md 文件（assets/ 等资源）不参与聚合。
 */
export function collectMarkdownFiles(postsDir: string): string[] {
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
      } else if (entry.endsWith('.md')) {
        files.push(full)
      }
    }
  }
  walk(postsDir)
  return files
}

/**
 * 递归聚合文章源：slug = 相对目录路径（/ 分隔，不含 .md 后缀）。
 * 任意深度目录（如 pi-agent/01.md → slug "pi-agent/01"）都能被聚合，
 * 根层文章行为不变（slug = 文件名）；排序由 loadPosts 按 date 完成。
 */
export function collectPostSources(postsDir: string): PostSource[] {
  return collectMarkdownFiles(postsDir).map((file) => ({
    slug: relative(postsDir, file).split(sep).join('/').replace(/\.md$/, ''),
    raw: readFileSync(file, 'utf8'),
  }))
}
