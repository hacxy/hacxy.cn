import type { Post } from './types.ts'

import { loadPosts } from './loadPosts.ts'

const modules = import.meta.glob('../../content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const sources = Object.entries(modules).map(([path, raw]) => {
  const file = path.split('/').pop() ?? ''
  return { slug: file.replace(/\.md$/, ''), raw: raw as string }
})

/** 构建期聚合的内容清单：全部非 draft 文章，按日期倒序 */
export const posts: Post[] = loadPosts(sources)
