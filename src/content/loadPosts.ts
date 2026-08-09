import type { Post, PostSource } from './types.ts'

import { parseMarkdown } from './parseMarkdown.ts'

/** loadPosts 选项 */
export interface LoadPostsOptions {
  /** dev 预览：包含 draft 文章（默认 false，构建与发布清单排除草稿） */
  includeDrafts?: boolean
}

/**
 * 聚合文章：draft 过滤（可经 includeDrafts 关闭）+ date 倒序（最新在前）。
 * 空输入返回空数组。
 */
export async function loadPosts(
  sources: PostSource[],
  options: LoadPostsOptions = {},
): Promise<Post[]> {
  const posts = await Promise.all(sources.map(({ slug, raw }) => parseMarkdown(raw, slug)))
  const list = options.includeDrafts ? posts : posts.filter((post) => !post.draft)
  return list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}
