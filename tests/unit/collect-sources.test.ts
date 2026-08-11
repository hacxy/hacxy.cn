import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { collectMarkdownFiles, collectPostSources } from '../../src/content/collectSources.ts'
import { loadPosts } from '../../src/content/loadPosts.ts'

const POSTS_DIR = join(process.cwd(), 'content', 'posts')

describe('collectMarkdownFiles: recursive scan', () => {
  it('walks nested directories and returns only .md files (arbitrary depth)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'posts-'))
    try {
      mkdirSync(join(dir, 'a', 'b', 'c'), { recursive: true })
      writeFileSync(join(dir, 'a', 'root.md'), '# r')
      writeFileSync(join(dir, 'a', 'b', 'c', 'deep.md'), '# d')
      writeFileSync(join(dir, 'a', 'b', 'note.txt'), 'x')
      writeFileSync(join(dir, 'a', 'b', 'asset.png'), 'x')

      const files = collectMarkdownFiles(dir).map((file) => file.replace(`${dir}/`, ''))
      expect(files.sort()).toEqual(['a/b/c/deep.md', 'a/root.md'])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('aggregates the real content/posts tree including nested and root posts', () => {
    const files = collectMarkdownFiles(POSTS_DIR)
    const names = files.map((file) => file.replace(`${POSTS_DIR}/`, ''))
    // 根层文章
    expect(names).toContain('hello-world.md')
    // 嵌套目录文章
    expect(names).toContain('pi-agent/01.md')
    // 非 md 资源（assets/ 等）不参与聚合
    expect(names.some((name) => !name.endsWith('.md'))).toBe(false)
  })
})

describe('collectPostSources: slug derivation contract', () => {
  it('derives nested slug from the relative directory path (no .md suffix)', () => {
    const slugs = collectPostSources(POSTS_DIR).map((source) => source.slug)
    // 嵌套：相对目录路径（/ 分隔）
    expect(slugs).toContain('pi-agent/01')
    // 根层：文件名（现状零回归）
    expect(slugs).toContain('hello-world')
    expect(slugs).toContain('prerendered-blog-with-vite')
    // 任何 slug 都不含 .md 后缀
    for (const slug of slugs) {
      expect(slug.endsWith('.md')).toBe(false)
    }
  })

  it('recurses to arbitrary depth with /-separated slugs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'posts-'))
    try {
      mkdirSync(join(dir, 'a', 'b', 'c'), { recursive: true })
      writeFileSync(join(dir, 'a', 'root.md'), '# r')
      writeFileSync(join(dir, 'a', 'b', 'c', 'deep.md'), '# d')

      const slugs = collectPostSources(dir)
        .map((source) => source.slug)
        .sort()
      expect(slugs).toEqual(['a/b/c/deep', 'a/root'])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('loadPosts: recursive aggregation pipeline', () => {
  it('aggregates nested posts with directory slugs and keeps global date-desc order', async () => {
    const posts = await loadPosts(collectPostSources(POSTS_DIR))

    const nested = posts.find((post) => post.slug === 'pi-agent/01')
    expect(nested).toBeDefined()
    expect(nested?.title).toBe('什么是 pi agent')
    expect(nested?.date).toBe('2026-08-12')

    // 嵌套文章参与全局日期倒序（首页平铺契约）
    for (let i = 1; i < posts.length; i++) {
      const prev = posts[i - 1]
      const current = posts[i]
      if (prev && current) {
        expect(prev.date >= current.date).toBe(true)
      }
    }
  })
})
