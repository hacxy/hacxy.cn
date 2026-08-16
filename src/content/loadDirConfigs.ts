import type { DirConfig, DirConfigContext, DirConfigMap } from './dirConfig.ts'
import type { Post } from './types.ts'

import { readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

import { directoryOf } from './navigation.ts'

/** 目录配置文件名：content/posts/<目录>/config.ts */
export const DIR_CONFIG_FILE = 'config.ts'

/**
 * 递归收集目录下全部 config.ts（绝对路径，任意深度；含根层 config.ts）。
 * 仅精确匹配 config.ts——非 .md 文章与 assets/ 资源天然不参与。
 */
export function collectConfigFiles(postsDir: string): string[] {
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
      } else if (entry === DIR_CONFIG_FILE) {
        files.push(full)
      }
    }
  }
  walk(postsDir)
  return files
}

/**
 * 构建期求值目录配置：Node 原生 type stripping 直接动态导入 .ts 配置文件
 * （Node ≥ 23.6，零新依赖）。
 *
 * 契约：
 * - 配置文件 default 导出 defineDirConfig((ctx) => ({ showSubdirs }))；
 * - 上下文 = 目录相对路径 + 该目录文章清单（不含子目录，日期倒序）；
 * - query 参数击穿模块缓存：dev watch 下 config.ts 变更后重新求值；
 * - 求值失败（导入错误 / 非工厂导出 / 工厂抛错 / 字段类型非法）抛错并带
 *   清晰上下文（配置文件路径），构建在第一时间暴露配置问题。
 */
export async function loadDirConfigs(postsDir: string, posts: Post[]): Promise<DirConfigMap> {
  const configs: DirConfigMap = {}
  for (const file of collectConfigFiles(postsDir)) {
    // 目录相对路径（'' = 根层；与 collectPostSources 的 slug 推导同一分隔符契约）
    const dir = relative(postsDir, dirname(file)).split(sep).join('/')

    let mod: { default?: unknown }
    try {
      mod = (await import(`${pathToFileURL(file).href}?t=${Date.now()}`)) as {
        default?: unknown
      }
    } catch (error) {
      throw new Error(`目录配置加载失败：${file}\n${(error as Error).message}`, { cause: error })
    }

    const factory = mod.default
    if (typeof factory !== 'function') {
      throw new Error(
        `目录配置必须 default 导出 defineDirConfig((ctx) => ({ showSubdirs }))：${file}`,
      )
    }

    const ctx: DirConfigContext = {
      path: dir,
      posts: posts
        .filter((post) => directoryOf(post.slug) === dir)
        .map((post) => ({ slug: post.slug, title: post.title, date: post.date })),
    }

    let config: DirConfig
    try {
      config = factory(ctx) ?? {}
    } catch (error) {
      throw new Error(`目录配置求值失败：${file}\n${(error as Error).message}`, { cause: error })
    }

    if (config.showSubdirs !== undefined && typeof config.showSubdirs !== 'boolean') {
      throw new Error(`目录配置字段 showSubdirs 必须为布尔值（缺省 true）：${file}`)
    }
    if (config.showSubdirs !== undefined) {
      configs[dir] = { showSubdirs: config.showSubdirs }
    }
  }
  return configs
}
