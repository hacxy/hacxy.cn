import type { Post } from './types.ts'

import matter from 'gray-matter'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

/** YYYY-MM-DD 严格格式 */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeStringify)

function formatDate(d: Date): string {
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeDate(value: unknown, slug: string): string {
  // gray-matter（js-yaml）会把 YAML 日期解析为 Date 对象
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDate(value)
  }
  if (typeof value === 'string' && ISO_DATE_RE.test(value)) {
    return value
  }
  throw new Error(
    `[content] post "${slug}" 的 frontmatter.date 缺失或非法（需为 YYYY-MM-DD），实际值：${JSON.stringify(value)}`,
  )
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

/**
 * 把一篇 Markdown 源文本渲染为 Post。
 * frontmatter 缺字段时使用确定性默认值：
 * - title 缺失/为空 → slug
 * - description 缺失 → ''
 * - tags 缺失/非数组 → []
 * - draft 缺失 → false
 * - updated 缺失 → undefined
 * - date 缺失或非法（非 YYYY-MM-DD）→ 抛出 Error（无法排序的文章不允许发布）
 */
export function parseMarkdown(raw: string, slug: string): Post {
  const { data, content } = matter(raw)

  const title = normalizeString(data.title) || slug
  const date = normalizeDate(data.date, slug)
  const description = normalizeString(data.description)
  const tags = normalizeStringArray(data.tags)
  const draft = data.draft === true
  const updated = normalizeString(data.updated) || undefined

  const html = String(processor.processSync(content))

  return { slug, title, date, description, tags, draft, updated, html, toc: [] }
}
