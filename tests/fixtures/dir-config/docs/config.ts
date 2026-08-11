import { defineDirConfig } from '../../../../src/content/dirConfig.ts'

/**
 * 目录配置 fixture：docs 层。ctx.path 为 'docs'，ctx.posts = docs 直接文章
 * （intro，不含 deep 子目录文章）。
 */
export default defineDirConfig((ctx) => ({
  showSubdirs: ctx.posts.length === 1,
}))
