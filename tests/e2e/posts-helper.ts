import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// gray-matter 无类型声明：E2E 仅用它解析 frontmatter 计算期望值（与构建期内容清单同一契约）
const require = createRequire(import.meta.url)
const matter = require('gray-matter') as (input: string) => {
  data: {
    draft?: boolean
    tags?: string[]
    title?: string
    description?: string
    /** gray-matter/js-yaml 会把 YYYY-MM-DD 解析为 Date 对象 */
    date?: string | Date
  }
}

/** 与内容管线同一日期契约：Date 对象归一化为 YYYY-MM-DD（ISO） */
function normalizeDate(value: string | Date | undefined): string {
  if (!value) return ''
  return typeof value === 'string' ? value : value.toISOString().slice(0, 10)
}

const POSTS_DIR = fileURLToPath(new URL('../../content/posts/', import.meta.url))

/**
 * 递归收集 content/posts 下全部 .md：slug = 相对目录路径（/ 分隔，不含 .md 后缀）。
 * 与构建期内容管线同一契约（collectPostSources）：嵌套目录（如 pi-agent/01.md）
 * 推导出嵌套 slug（pi-agent/01），非 md 文件（assets/ 等）不参与聚合。
 */
function collectSources(): { slug: string; raw: string }[] {
  const sources: { slug: string; raw: string }[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
      } else if (entry.endsWith('.md')) {
        sources.push({
          slug: relative(POSTS_DIR, full).split(sep).join('/').replace(/\.md$/, ''),
          raw: readFileSync(full, 'utf8'),
        })
      }
    }
  }
  walk(POSTS_DIR)
  return sources
}

export interface ExpectedPost {
  slug: string
  title: string
  date: string
  description: string
  tags: string[]
  draft: boolean
}

/**
 * 期望文章清单：递归扫描内容源 + frontmatter 解析（与构建期内容清单同一契约：
 * 非 draft、日期倒序）。全部 e2e 的期望值由此计算——新增/嵌套文章无需改测试代码。
 */
export function publishedPosts(): ExpectedPost[] {
  return collectSources()
    .map(({ slug, raw }) => {
      const data = matter(raw).data
      return {
        slug,
        title: data.title ?? '',
        date: normalizeDate(data.date),
        description: data.description ?? '',
        tags: data.tags ?? [],
        draft: data.draft ?? false,
      }
    })
    .filter((post) => !post.draft)
    .sort((a, b) => (a.date < b.date ? 1 : -1)) // 内容清单按日期倒序（最新在前）
}
