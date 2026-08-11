import { defineDirConfig } from '../../../src/content/dirConfig.ts'

/**
 * 目录配置 fixture（tests/unit/dir-config.test.ts 驱动）：根层（''）配置。
 * ctx.path 为 ''，ctx.posts = 根层文章（root-a）。
 */
export default defineDirConfig((ctx) => ({
  showSubdirs: ctx.path === '',
}))
