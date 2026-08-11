import type { Post } from '../../src/content/types.ts'

import { describe, expect, it } from 'vitest'

import { directoryOf, sameDirectoryNeighbors } from '../../src/content/navigation.ts'

function post(slug: string, date: string): Post {
  return { slug, title: slug, date, description: '', tags: [], draft: false, html: '', toc: [] }
}

describe('directoryOf: slug → 所在目录', () => {
  it('root-level slugs map to an empty directory', () => {
    expect(directoryOf('hello-world')).toBe('')
    expect(directoryOf('prerendered-blog-with-vite')).toBe('')
  })

  it('nested slugs map to their relative directory path (arbitrary depth)', () => {
    expect(directoryOf('pi-agent/01')).toBe('pi-agent')
    expect(directoryOf('a/b/c/post')).toBe('a/b/c')
  })
})

describe('sameDirectoryNeighbors: 同目录相邻（按日期倒序、边界停止）', () => {
  it('nested directory: neighbors stay inside the directory, no cross-directory jumps', () => {
    const list = [
      post('pi-agent/01', '2026-08-12'),
      post('prerendered-blog-with-vite', '2026-08-11'), // 全局第二新，但不同目录
      post('pi-agent/02', '2026-08-09'),
    ]

    // 01 的下一篇是 02（同目录内更旧），不是全局相邻的根层文章
    const { newer, older } = sameDirectoryNeighbors(list, 'pi-agent/01')
    expect(newer).toBeUndefined()
    expect(older?.slug).toBe('pi-agent/02')

    // 02 的上一篇是 01（同目录内更新），无下一篇（目录边界）
    const middle = sameDirectoryNeighbors(list, 'pi-agent/02')
    expect(middle.newer?.slug).toBe('pi-agent/01')
    expect(middle.older).toBeUndefined()
  })

  it('root directory: neighbors only among root-level posts', () => {
    const list = [
      post('pi-agent/01', '2026-08-12'), // 全局最新，但不同目录
      post('root-new', '2026-08-11'),
      post('root-old', '2026-08-05'),
    ]

    // 根层最新：无上一篇（即使全局有更新的嵌套文章，也不跨界）
    const { newer, older } = sameDirectoryNeighbors(list, 'root-new')
    expect(newer).toBeUndefined()
    expect(older?.slug).toBe('root-old')
  })

  it('boundaries: first has no newer, last has no older', () => {
    const list = [post('a/1', '2026-08-12'), post('a/2', '2026-08-10'), post('a/3', '2026-08-01')]

    expect(sameDirectoryNeighbors(list, 'a/1').newer).toBeUndefined()
    expect(sameDirectoryNeighbors(list, 'a/3').older).toBeUndefined()

    const middle = sameDirectoryNeighbors(list, 'a/2')
    expect(middle.newer?.slug).toBe('a/1')
    expect(middle.older?.slug).toBe('a/3')
  })

  it('returns no neighbors for an unknown slug', () => {
    const list = [post('a/1', '2026-08-12')]
    const { newer, older } = sameDirectoryNeighbors(list, 'nope')
    expect(newer).toBeUndefined()
    expect(older).toBeUndefined()
  })
})
