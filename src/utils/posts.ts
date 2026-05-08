import yaml from 'js-yaml'
import gitDates from 'virtual:git-dates'

export interface Post {
  slug: string
  title: string
  date: string | null
  tags: string[]
  rawContent: string
}

export interface FrontmatterData {
  title?: string
  date?: string | Date
  tags?: unknown[]
  [key: string]: unknown
}

const modules = import.meta.glob('/posts/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const FM_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

export function parseFrontmatter(raw: string): { data: FrontmatterData; content: string } {
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

function filePathToSlug(filePath: string): string {
  return filePath
    .replace(/^\/posts\//, '')
    .replace(/\.md$/, '')
    .replace(/\/index$/, '')
}

function parseDate(raw: string | Date | undefined): string | null {
  if (!raw) return null
  if (raw instanceof Date) return raw.toISOString().slice(0, 10)
  if (typeof raw === 'string') return raw.slice(0, 10)
  return null
}

function buildPost(filePath: string, rawContent: string): Post {
  const { data, content } = parseFrontmatter(rawContent)
  const title = (data.title as string | undefined) || extractH1(content)
  const date = parseDate(data.date as string | Date | undefined) ?? gitDates[filePath] ?? null
  const tags: string[] = Array.isArray(data.tags) ? data.tags.map(String) : []
  const slug = filePathToSlug(filePath)
  return { slug, title, date, tags, rawContent }
}

let _cache: Post[] | null = null

function getAll(): Post[] {
  if (_cache) return _cache
  _cache = Object.entries(modules).map(([path, raw]) => buildPost(path, raw))
  return _cache
}

export function getAllPosts(): Post[] {
  return getAll().sort((a, b) => {
    if (!a.date && !b.date) return a.title.localeCompare(b.title)
    if (!a.date) return 1
    if (!b.date) return -1
    return b.date.localeCompare(a.date)
  })
}

export function getPostBySlug(slug: string): Post | undefined {
  return getAll().find(p => p.slug === slug)
}

export function getAdjacentPosts(slug: string): { prev: Post | null; next: Post | null } {
  const posts = getAllPosts()
  const idx = posts.findIndex(p => p.slug === slug)
  if (idx === -1) return { prev: null, next: null }
  return {
    prev: posts[idx - 1] ?? null,
    next: posts[idx + 1] ?? null,
  }
}

export function getPostsByTag(tag: string): Post[] {
  return getAllPosts().filter(p => p.tags.includes(tag))
}

export function getAllTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const post of getAll()) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

export function getPostsGroupedByYear(): { year: string; posts: Post[] }[] {
  const posts = getAllPosts()
  const groups = new Map<string, Post[]>()
  for (const post of posts) {
    const year = post.date ? post.date.slice(0, 4) : '—'
    if (!groups.has(year)) groups.set(year, [])
    groups.get(year)!.push(post)
  }
  return Array.from(groups.entries())
    .map(([year, posts]) => ({ year, posts }))
    .sort((a, b) => b.year.localeCompare(a.year))
}
