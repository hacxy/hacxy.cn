import type { Post } from '../../src/content/types.ts'

import { describe, expect, it } from 'vitest'

import { ancestorPaths, buildPostTree, type TreeNode } from '../../src/content/tree.ts'

function post(slug: string, date: string): Post {
  return { slug, title: slug, date, description: '', tags: [], draft: false, html: '', toc: [] }
}

/** 展平树：按先序收集全部文章 slug（用于无损断言） */
function flattenSlugs(nodes: TreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.type === 'folder' ? flattenSlugs(node.children) : [node.post.slug],
  )
}

/** 展平树：按先序收集节点标识（文件夹 = path，文章 = slug） */
function flattenPaths(nodes: TreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.type === 'folder' ? [node.path, ...flattenPaths(node.children)] : [node.post.slug],
  )
}

describe('buildPostTree: 树 = 内容清单（平铺列表）之上的派生结构', () => {
  it('empty list derives an empty tree', () => {
    expect(buildPostTree([])).toEqual([])
  })

  it('root-level posts only: leaves in date-desc order (flat contract preserved)', () => {
    const tree = buildPostTree([
      post('old', '2026-01-01'),
      post('new', '2026-08-10'),
      post('mid', '2026-05-05'),
    ])

    expect(tree.map((node) => (node.type === 'post' ? node.post.slug : node.path))).toEqual([
      'new',
      'mid',
      'old',
    ])
  })

  it('groups nested slugs under their directory folder, posts date-desc inside', () => {
    const tree = buildPostTree([
      post('root-a', '2026-08-10'),
      post('pi-agent/02', '2026-08-09'),
      post('pi-agent/01', '2026-08-12'),
    ])

    // 根层 = 文件夹 + 根层文章
    expect(flattenPaths(tree)).toEqual(['pi-agent', 'pi-agent/01', 'pi-agent/02', 'root-a'])
    const folder = tree[0]
    expect(folder).toMatchObject({ type: 'folder', path: 'pi-agent', name: 'pi-agent' })
    if (folder?.type === 'folder') {
      expect(folder.children.map((node) => (node.type === 'post' ? node.post.slug : ''))).toEqual([
        'pi-agent/01', // 日期倒序：01 (08-12) 在前
        'pi-agent/02', // 02 (08-09) 在后
      ])
    }
  })

  it('sorts folders alphabetically before posts date-desc within a level', () => {
    const tree = buildPostTree([
      post('root-z', '2026-08-13'),
      post('beta/1', '2026-08-10'),
      post('alpha/1', '2026-08-10'),
      post('root-a', '2026-08-12'),
    ])

    // 同层规则：文件夹（字母序）在前，文章（日期倒序：root-z 08-13 在 root-a 08-12 前）在后
    expect(tree.map((node) => (node.type === 'folder' ? node.path : node.post.slug))).toEqual([
      'alpha',
      'beta',
      'root-z',
      'root-a',
    ])
  })

  it('applies the same sorting rule recursively at every depth', () => {
    const tree = buildPostTree([
      post('a/post-late', '2026-08-01'),
      post('a/folder-b/1', '2026-08-10'),
      post('a/post-early', '2026-08-20'),
      post('a/folder-a/1', '2026-08-10'),
    ])

    expect(flattenPaths(tree)).toEqual([
      'a',
      'a/folder-a', // 文件夹字母序：folder-a 在 folder-b 前
      'a/folder-a/1',
      'a/folder-b',
      'a/folder-b/1',
      'a/post-early', // 文件夹全部在前，其后文章日期倒序
      'a/post-late',
    ])
  })

  it('nests arbitrary-depth directories into a single tree', () => {
    const tree = buildPostTree([
      post('a/b/c/x', '2026-08-01'),
      post('a/y', '2026-08-02'),
      post('z', '2026-08-03'),
    ])

    expect(flattenPaths(tree)).toEqual(['a', 'a/b', 'a/b/c', 'a/b/c/x', 'a/y', 'z'])
    const c = flattenSlugs(tree)
    expect(c).toContain('a/b/c/x')
  })

  it('derives from the same source without loss or duplication and does not mutate the input list', () => {
    const list = [
      post('root', '2026-08-10'),
      post('pi-agent/02', '2026-08-09'),
      post('pi-agent/01', '2026-08-12'),
      post('a/b/c', '2026-08-01'),
    ]
    const before = list.map((item) => item.slug)

    const tree = buildPostTree(list)

    // 树为清单之上的派生：每篇文章恰好出现一次（无丢失、无重复）
    expect(flattenSlugs(tree).sort()).toEqual([...before].sort())
    // 平铺契约不回归：输入清单不被修改（仍为原日期倒序清单）
    expect(list.map((item) => item.slug)).toEqual(before)
  })
})

describe('ancestorPaths: slug → 当前文章所在分支（需自动展开的祖先文件夹）', () => {
  it('root-level slug has no ancestors', () => {
    expect(ancestorPaths('hello-world')).toEqual([])
    expect(ancestorPaths('prerendered-blog-with-vite')).toEqual([])
  })

  it('single-level nested slug expands its directory', () => {
    expect(ancestorPaths('pi-agent/01')).toEqual(['pi-agent'])
  })

  it('arbitrary-depth slug expands every ancestor level in order', () => {
    expect(ancestorPaths('a/b/c/post')).toEqual(['a', 'a/b', 'a/b/c'])
  })
})
