import rawPosts from 'virtual:blog-posts'
import { parseFrontmatter } from './frontmatter'

export type { FrontmatterData } from './frontmatter'
export { parseFrontmatter }

export interface Post {
  slug: string
  title: string
  date: string | null
  tags: string[]
  series: string | null
  rawContent: string
}

export function getAllPosts(): Post[] {
  return [...rawPosts].sort((a, b) => {
    if (!a.date && !b.date) return a.title.localeCompare(b.title)
    if (!a.date) return 1
    if (!b.date) return -1
    return b.date.localeCompare(a.date)
  })
}

export function getPostBySlug(slug: string): Post | undefined {
  return rawPosts.find(p => p.slug === slug)
}

export function getPostsByTag(tag: string): Post[] {
  return getAllPosts().filter(p => p.tags.includes(tag))
}

export function getAllTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const post of rawPosts) {
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
