import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 构建期站点元数据收集（issue #42）：package.json 版本号 + 真实仓库 git 统计。
 * 仅 Node 侧（vite 插件 / 单测）导入——child_process / fs 不能进浏览器包，
 * 浏览器侧经 virtual:site-meta 拿到注入后的 JSON（见 vite-site-meta-plugin.ts）。
 */

/** 真实仓库统计（构建期注入；git 不可得时为 null，状态栏优雅省略该段） */
export interface GitStats {
  /** 分支名（CI 分离头指针时为 HEAD） */
  branch: string
  /** 短 SHA */
  sha: string
  /** 提交数（git rev-list --count HEAD） */
  commitCount: number
  /** 工作区是否有未提交改动（git status --porcelain 非空） */
  dirty: boolean
}

/** 构建期注入的站点元数据（virtual:site-meta） */
export interface SiteMeta {
  /** package.json version（读取失败回退 0.0.0，不阻塞构建） */
  version: string
  /** git 统计；不可得（CI 浅克隆 / 非 git 目录 / git 未安装）时为 null */
  git: GitStats | null
}

/** git 可用性探测：非 git 目录 / git 缺失 → false（不抛错） */
function isGitWorkTree(exec: typeof execSync): boolean {
  try {
    return exec('git rev-parse --is-inside-work-tree').toString().trim() === 'true'
  } catch {
    return false
  }
}

/**
 * 收集真实仓库统计：分支名 + 短 SHA + 提交数 + 脏标记。
 * exec 可注入（单测模拟 git 缺失 / 浅克隆 / 非 git 目录等不可得场景）；
 * 任何一步失败或结果不可用 → 返回 null（状态栏省略该段，构建与发布不受阻）。
 */
export function collectGitStats(exec: typeof execSync = execSync): GitStats | null {
  if (!isGitWorkTree(exec)) return null
  try {
    const branch = exec('git rev-parse --abbrev-ref HEAD').toString().trim()
    const sha = exec('git rev-parse --short HEAD').toString().trim()
    const commitCount = Number.parseInt(exec('git rev-list --count HEAD').toString().trim(), 10)
    const dirty = exec('git status --porcelain').toString().trim().length > 0
    if (!branch || !sha || !Number.isFinite(commitCount)) return null
    return { branch, sha, commitCount, dirty }
  } catch {
    return null
  }
}

/** 站点版本：构建期读取 package.json（版本缺失/损坏回退 0.0.0） */
export function collectSiteMeta(): SiteMeta {
  let version = '0.0.0'
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      version?: unknown
    }
    if (typeof pkg.version === 'string' && pkg.version) version = pkg.version
  } catch {
    /* package.json 缺失/损坏：回退 0.0.0，不阻塞构建 */
  }
  return { version, git: collectGitStats() }
}
