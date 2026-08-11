import { defineDirConfig } from '../../../src/content/dirConfig.ts'

/**
 * issue #45 fixture：archive 层隐藏子文件夹抽屉——侧栏树中该层只显示
 * 本目录文章（notes/journal），子目录 private/ 不出现在树中；其文章仍可
 * 经 URL 与上一篇/下一篇访问（清单不受影响，树只是派生结构）。
 * 编辑器内 ctx.path 与 ctx.posts（该目录文章，日期倒序）均有类型提示与补全
 * （共享模块 DirConfigContext）；fixture 顺带断言上下文契约（路径不符即构建报错）。
 */
export default defineDirConfig((ctx) => {
  if (ctx.path !== 'archive') {
    throw new Error(`unexpected ctx.path: ${ctx.path}`)
  }
  return { showSubdirs: false }
})
