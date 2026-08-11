import type { GitStats } from './siteMeta.ts'

/**
 * git 状态段展示形态（终端状态栏，issue #42）：
 * `branch@shortsha · N commits`；工作区有未提交改动时分支名后缀 `*`（bash PS1 惯例）。
 * 客户端渲染用纯函数（浏览器安全：仅类型导入 siteMeta）；e2e 期望值从真实仓库
 * 按同一契约计算（tests/e2e/git-helper.ts）。
 */
export function formatGitStats(git: GitStats): string {
  return `${git.branch}${git.dirty ? '*' : ''}@${git.sha} · ${git.commitCount} commits`
}
