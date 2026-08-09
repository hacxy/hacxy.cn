import type { Post, PostSource } from './types.ts'

import { parseMarkdown } from './parseMarkdown.ts'

/**
 * 聚合文章：draft 过滤 + date 倒序（最新在前）。
 * 空输入返回空数组。
 */
export function loadPosts(sources: PostSource[]): Post[] {
  return sources
    .map(({ slug, raw }) => parseMarkdown(raw, slug))
    .filter((post) => !post.draft)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}
