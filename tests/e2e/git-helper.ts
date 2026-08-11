import { execSync } from 'node:child_process'

export interface ExpectedGitStats {
  branch: string
  sha: string
  commitCount: number
  dirty: boolean
}

/**
 * 期望 git 统计：从真实仓库计算（issue #42 验收「git 期望值从真实仓库计算」，
 * 与构建期注入同一契约：分支 / 短 SHA / 提交数 / 工作区脏标记）。
 * git 不可得（非 git 目录 / CI 浅克隆 / git 未安装）时返回 null——
 * 状态栏该段优雅省略，e2e 相应跳过（省略逻辑本身由单测覆盖）。
 */
export function currentGitStats(): ExpectedGitStats | null {
  try {
    const inside = execSync('git rev-parse --is-inside-work-tree').toString().trim()
    if (inside !== 'true') return null
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
    const sha = execSync('git rev-parse --short HEAD').toString().trim()
    const commitCount = Number.parseInt(execSync('git rev-list --count HEAD').toString().trim(), 10)
    const dirty = execSync('git status --porcelain').toString().trim().length > 0
    return { branch, sha, commitCount, dirty }
  } catch {
    return null
  }
}
