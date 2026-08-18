import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import PageMetaManager from './index'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PageMetaManager />
    </MemoryRouter>,
  )
}

describe('PageMetaManager', () => {
  it('静态首页设置站点标题与 bio 描述', () => {
    renderAt('/')
    expect(document.title).toBe('Test Blog')
    const meta = document.querySelector('meta[name="description"]')
    expect(meta?.getAttribute('content')).toBe('测试博客描述')
  })

  it('/posts 设置 Blog 前缀标题', () => {
    renderAt('/posts')
    expect(document.title).toBe('Blog | Test Blog')
  })

  it('/tags 设置标签标题', () => {
    renderAt('/tags')
    expect(document.title).toBe('Tags | Test Blog')
  })

  it('/about 设置 About 标题', () => {
    renderAt('/about')
    expect(document.title).toBe('About | Test Blog')
  })

  it('文章路由从 posts 解析标题与摘要', () => {
    renderAt('/post-a')
    expect(document.title).toBe('Post A | Test Blog')
    const meta = document.querySelector('meta[name="description"]')
    expect(meta?.getAttribute('content')).toContain('正文内容')
  })

  it('不存在的文章不设置标题（保持为前一个值）', () => {
    renderAt('/')
    const firstTitle = document.title
    renderAt('/no-such-post')
    expect(document.title).toBe(firstTitle)
  })
})
