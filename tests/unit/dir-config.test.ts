import type { Post } from '../../src/content/types.ts'

import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { collectPostSources } from '../../src/content/collectSources.ts'
import {
  DIR_CONFIG_FILE,
  collectConfigFiles,
  loadDirConfigs,
} from '../../src/content/loadDirConfigs.ts'
import { dirConfigs, posts } from '../../src/content/posts.ts'
import { buildPostTree, type TreeNode } from '../../src/content/tree.ts'

const FIXTURES_DIR = join(process.cwd(), 'tests', 'fixtures', 'dir-config')
const FIXTURES_ERRORS_DIR = join(process.cwd(), 'tests', 'fixtures', 'dir-config-errors')
const POSTS_DIR = join(process.cwd(), 'content', 'posts')

function post(slug: string, date: string): Post {
  return { slug, title: slug, date, description: '', tags: [], draft: false, html: '', toc: [] }
}

/** 展平树：按先序收集节点标识（文件夹 = path，文章 = slug） */
function flattenPaths(nodes: TreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.type === 'folder' ? [node.path, ...flattenPaths(node.children)] : [node.post.slug],
  )
}

describe('collectConfigFiles: 递归收集 config.ts（配置加载输入）', () => {
  it('finds config.ts at every depth including root, ignoring other files', () => {
    const files = collectConfigFiles(FIXTURES_DIR).map((file) =>
      file.replace(`${FIXTURES_DIR}/`, ''),
    )
    expect(files).toContain(DIR_CONFIG_FILE)
    expect(files).toContain('docs/config.ts')
    expect(files).toContain('docs-empty/config.ts')
    // 非 config.ts（.md 文章等）不参与
    expect(files.some((file) => file.endsWith('.md'))).toBe(false)
  })
})

describe('loadDirConfigs: 构建期求值目录配置（fixture config.ts 驱动）', () => {
  it('evaluates factories with the dir path and the dir posts (subdir posts excluded)', async () => {
    const map = await loadDirConfigs(FIXTURES_DIR, [
      post('root-a', '2026-08-10'),
      post('docs/intro', '2026-08-09'),
      post('docs/deep/secret', '2026-08-08'),
    ])
    // 根层 ctx.path = ''、ctx.posts = 根层文章；docs ctx.posts 不含 deep 子目录文章
    expect(map).toEqual({ '': { showSubdirs: true }, docs: { showSubdirs: true } })
  })

  it('keeps showSubdirs absent out of the map (empty config is a no-op, default true)', async () => {
    const dir = join(FIXTURES_DIR, 'docs-empty')
    expect(await loadDirConfigs(dir, [post('docs-empty/intro', '2026-08-09')])).toEqual({})
  })

  it('throws a clear error (with the config path) when a config file cannot be loaded', async () => {
    const dir = join(FIXTURES_ERRORS_DIR, 'load-fail')
    await expect(loadDirConfigs(dir, [])).rejects.toThrow(/目录配置加载失败/)
    await expect(loadDirConfigs(dir, [])).rejects.toThrow(/config\.ts/)
    await expect(loadDirConfigs(dir, [])).rejects.toThrow(/boom-at-load/)
  })

  it('throws when the default export is not a factory', async () => {
    const dir = join(FIXTURES_ERRORS_DIR, 'not-factory')
    await expect(loadDirConfigs(dir, [])).rejects.toThrow(/default 导出 defineDirConfig/)
  })

  it('throws with the config path and cause when the factory throws', async () => {
    const dir = join(FIXTURES_ERRORS_DIR, 'factory-throws')
    await expect(loadDirConfigs(dir, [])).rejects.toThrow(/目录配置求值失败/)
    await expect(loadDirConfigs(dir, [])).rejects.toThrow(/boom/)
  })

  it('throws when showSubdirs is not a boolean', async () => {
    const dir = join(FIXTURES_ERRORS_DIR, 'bad-type')
    await expect(loadDirConfigs(dir, [])).rejects.toThrow(/showSubdirs 必须为布尔值/)
  })

  it('excludes config.ts from the post sources (non-.md natural exclusion)', () => {
    const slugs = collectPostSources(FIXTURES_DIR)
      .map((source) => source.slug)
      .sort()
    expect(slugs).toEqual(['docs-empty/intro', 'docs/deep/secret', 'docs/intro', 'root-a'])
  })
})

describe('buildPostTree 应用目录配置（issue #45）', () => {
  it('showSubdirs: false hides subfolder drawers and keeps the layer posts', () => {
    const tree = buildPostTree(
      [
        post('root', '2026-08-10'),
        post('docs/intro', '2026-08-09'),
        post('docs/deep/secret', '2026-08-08'),
      ],
      { docs: { showSubdirs: false } },
    )
    // docs 层：只显示该层文章（intro），deep 抽屉不出现
    expect(flattenPaths(tree)).toEqual(['docs', 'docs/intro', 'root'])
  })

  it('showSubdirs defaults to true: unconfigured directories keep subfolder drawers', () => {
    const tree = buildPostTree(
      [post('docs/intro', '2026-08-09'), post('docs/deep/secret', '2026-08-08')],
      { other: { showSubdirs: false } },
    )
    // docs 无配置 → 行为不变（deep 抽屉照常）
    expect(flattenPaths(tree)).toEqual(['docs', 'docs/deep', 'docs/deep/secret', 'docs/intro'])
  })

  it('configs do not inherit: a child config only affects its own layer', () => {
    const tree = buildPostTree(
      [
        post('docs/intro', '2026-08-09'),
        post('docs/deep/secret', '2026-08-08'),
        post('docs/deep/deeper/x', '2026-08-07'),
      ],
      { 'docs/deep': { showSubdirs: false } },
    )
    // docs 层无配置 → deep 抽屉照常；deep 自己的配置只隐藏 deeper 抽屉
    expect(flattenPaths(tree)).toEqual(['docs', 'docs/deep', 'docs/deep/secret', 'docs/intro'])
  })

  it('prunes folders left empty after hiding their subdirs', () => {
    const tree = buildPostTree([post('root', '2026-08-10'), post('notes/2025/old', '2026-08-01')], {
      notes: { showSubdirs: false },
    })
    // notes 层无直接文章、子目录被隐藏 → 空文件夹剪除（不渲染空抽屉）
    expect(flattenPaths(tree)).toEqual(['root'])
  })

  it('applies the root config (path "") to the root layer', () => {
    const tree = buildPostTree([post('root', '2026-08-10'), post('docs/intro', '2026-08-09')], {
      '': { showSubdirs: false },
    })
    // 根层配置生效：只显示根层文章，所有文件夹抽屉隐藏
    expect(flattenPaths(tree)).toEqual(['root'])
  })

  it('does not mutate the input list; hidden posts stay in the flat manifest', () => {
    const list = [post('docs/intro', '2026-08-09'), post('docs/deep/secret', '2026-08-08')]
    const before = list.map((p) => p.slug)
    buildPostTree(list, { docs: { showSubdirs: false } })
    expect(list.map((p) => p.slug)).toEqual(before)
  })
})

describe('真实内容 fixture（content/posts/archive/config.ts，issue #45）', () => {
  it('loads the archive config with showSubdirs: false; hidden posts stay in the manifest', () => {
    expect(dirConfigs['archive']).toEqual({ showSubdirs: false })
    expect(posts.some((p) => p.slug === 'archive/notes')).toBe(true)
    expect(posts.some((p) => p.slug === 'archive/private/secret')).toBe(true)
  })

  it('applies to the real tree: archive shows layer posts only, pi-agent untouched', () => {
    const tree = buildPostTree(posts, dirConfigs)
    const paths = flattenPaths(tree)
    expect(paths).toContain('archive')
    expect(paths).toContain('archive/notes')
    expect(paths).toContain('archive/journal')
    expect(paths).not.toContain('archive/private') // 子文件夹抽屉被隐藏
    expect(paths).toContain('pi-agent') // 无配置目录不受影响（互不继承）
    expect(paths).toContain('pi-agent/01')
  })

  it('real config file is loadable via Node type stripping through the plugin manifest', () => {
    // dirConfigs 由 vite 插件在构建期求值（loadDirConfigs 动态导入 config.ts，
    // 相对路径 + 显式 .ts 扩展名导入共享模块）——真实配置的导入链路成立
    expect(dirConfigs['pi-agent']).toBeUndefined()
    expect(POSTS_DIR).toContain('content/posts')
  })
})
