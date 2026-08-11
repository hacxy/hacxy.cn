import type { Post } from './types.ts'

/**
 * slug 的目录路径：根层文章返回 ''（如 hello-world），嵌套文章返回其所在目录
 * （如 pi-agent/01 → pi-agent，a/b/c/post → a/b/c）。与 collectPostSources 的
 * slug 推导契约（相对目录路径）一致。
 */
export function directoryOf(slug: string): string {
  const slash = slug.lastIndexOf('/')
  return slash >= 0 ? slug.slice(0, slash) : ''
}

/**
 * 同目录相邻（issue #43）：在 date 倒序清单中，只取同一目录内的相邻文章——
 * 上一篇 = 同目录内更新的文章，下一篇 = 同目录内更旧的文章；目录边界处停止，
 * 不跨界跳到其他目录的文章（与全局日期相邻解耦）。
 * 清单按日期倒序（loadPosts 排序结果），目录过滤后顺序不变，取 index±1 即相邻。
 */
export function sameDirectoryNeighbors(list: Post[], slug: string): { newer?: Post; older?: Post } {
  const dir = directoryOf(slug)
  const sameDir = list.filter((post) => directoryOf(post.slug) === dir)
  const index = sameDir.findIndex((post) => post.slug === slug)
  if (index < 0) return {}
  return { newer: sameDir[index - 1], older: sameDir[index + 1] }
}
