import { describe, expect, it } from 'vitest'

import {
  getAllPosts,
  getPostBySlug,
  getPostsByTag,
  getAllTags,
  getAllSeries,
  getPostsGroupedByYear,
} from './posts'

describe('getAllPosts', () => {
  it('按日期倒序排列', () => {
    const posts = getAllPosts()
    // 同日期保持稳定（输入顺序），跨日期倒序
    expect(posts[0]).toMatchObject({ date: '2025-03-10' })
    expect(posts[1]).toMatchObject({ date: '2025-03-10' })
    expect(posts[2].slug).toBe('post-a') // 2024-05-01
    expect(posts[3].slug).toBe('post-b') // 2024-01-15
  })

  it('无日期帖子排在最后', () => {
    const posts = getAllPosts()
    expect(posts[posts.length - 1].slug).toBe('post-d')
  })
})

describe('getPostBySlug', () => {
  it('按 slug 精确查找', () => {
    expect(getPostBySlug('post-a')?.title).toBe('Post A')
  })

  it('不存在的 slug 返回 undefined', () => {
    expect(getPostBySlug('nope')).toBeUndefined()
  })
})

describe('getPostsByTag', () => {
  it('返回包含该标签的所有帖子', () => {
    const posts = getPostsByTag('react')
    expect(posts.map((p) => p.slug)).toEqual(expect.arrayContaining(['post-a', 'post-b', 'post-c']))
  })

  it('无匹配时返回空数组', () => {
    expect(getPostsByTag('nonexistent')).toEqual([])
  })
})

describe('getAllTags', () => {
  it('按出现次数降序，同次数按字母', () => {
    expect(getAllTags()).toEqual([
      { tag: 'react', count: 3 },
      { tag: 'css', count: 1 },
      { tag: 'node', count: 1 },
    ])
  })
})

describe('getAllSeries', () => {
  it('返回去重排序后的系列名', () => {
    expect(getAllSeries()).toEqual(['系列一'])
  })
})

describe('getPostsGroupedByYear', () => {
  it('按年份分组且年份倒序', () => {
    const groups = getPostsGroupedByYear()
    expect(groups.map((g) => g.year)).toEqual(['2025', '2024', '—'])
    expect(groups[0].posts).toHaveLength(2)
  })

  it("无日期的帖子归入 '—' 组", () => {
    const groups = getPostsGroupedByYear()
    const dash = groups.find((g) => g.year === '—')
    expect(dash?.posts.map((p) => p.slug)).toEqual(['post-d'])
  })
})
