import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 构建期站点元数据收集（issue #42，issue #55 收敛）：package.json 版本号。
 * 仅 Node 侧（vite 插件 / 单测）导入——fs 不能进浏览器包，
 * 浏览器侧经 virtual:site-meta 拿到注入后的 JSON（见 vite-site-meta-plugin.ts）。
 */

/** 构建期注入的站点元数据（virtual:site-meta；issue #55 收敛为版本号单一职责） */
export interface SiteMeta {
  /** package.json version（读取失败回退 0.0.0，不阻塞构建） */
  version: string
}

/**
 * 站点版本：构建期读取 package.json（版本缺失/损坏回退 0.0.0，不阻塞构建）。
 * baseDir 可注入（单测用临时目录模拟缺失/损坏 package.json；与已删除的
 * collectGitStats 的 injectable exec 同一测试模式）；vite 插件用默认值 process.cwd()。
 */
export function collectSiteMeta(baseDir: string = process.cwd()): SiteMeta {
  let version = '0.0.0'
  try {
    const pkg = JSON.parse(readFileSync(join(baseDir, 'package.json'), 'utf8')) as {
      version?: unknown
    }
    if (typeof pkg.version === 'string' && pkg.version) version = pkg.version
  } catch {
    /* package.json 缺失/损坏：回退 0.0.0，不阻塞构建 */
  }
  return { version }
}
