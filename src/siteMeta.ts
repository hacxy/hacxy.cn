import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 构建期站点元数据收集（issue #55）：package.json 版本号单一职责。
 * 仅 Node 侧（vite 插件 / 单测）导入——fs 不能进浏览器包，
 * 浏览器侧经 virtual:site-meta 拿到注入后的 JSON（见 vite-site-meta-plugin.ts）。
 * issue #42 的 git 统计收集栈（collectGitStats / GitStats）已随状态栏精简删除。
 */

/** 构建期注入的站点元数据（virtual:site-meta 契约 = { version }） */
export interface SiteMeta {
  /** package.json version（读取失败回退 0.0.0，不阻塞构建） */
  version: string
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
  return { version }
}
