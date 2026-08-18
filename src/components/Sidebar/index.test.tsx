import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import Sidebar from './index'

const items = [
  { text: '系列一', link: '/posts/series-1' },
  {
    text: '分组',
    items: [
      { text: '子项A', link: '/posts/a' },
      { text: '子项B', link: '/posts/b' },
    ],
  },
  { text: '孤立项' }, // 无 link 无 items -> span
]

describe('Sidebar', () => {
  it('渲染普通链接项', () => {
    render(
      <MemoryRouter>
        <Sidebar items={items} currentPath="/posts/series-1" />
      </MemoryRouter>,
    )
    expect(screen.getByText('系列一')).toBeInTheDocument()
  })

  it('递归渲染分组与子项', () => {
    render(
      <MemoryRouter>
        <Sidebar items={items} currentPath="/" />
      </MemoryRouter>,
    )
    expect(screen.getByText('分组')).toBeInTheDocument()
    expect(screen.getByText('子项A')).toBeInTheDocument()
    expect(screen.getByText('子项B')).toBeInTheDocument()
  })

  it('无链接项渲染为 span 而非链接', () => {
    render(
      <MemoryRouter>
        <Sidebar items={items} currentPath="/" />
      </MemoryRouter>,
    )
    const span = screen.getByText('孤立项')
    expect(span.tagName).toBe('SPAN')
  })

  it('当前路径项高亮 active class', () => {
    render(
      <MemoryRouter>
        <Sidebar items={items} currentPath="/posts/series-1" />
      </MemoryRouter>,
    )
    const link = screen.getByText('系列一')
    expect(link.className).toContain('active')
  })

  it('非当前路径项不带 active class', () => {
    render(
      <MemoryRouter>
        <Sidebar items={items} currentPath="/other" />
      </MemoryRouter>,
    )
    expect(screen.getByText('系列一').className).not.toContain('active')
  })

  it('点击链接触发 onNavigate', async () => {
    const onNavigate = vi.fn()
    render(
      <MemoryRouter>
        <Sidebar items={items} currentPath="/" onNavigate={onNavigate} />
      </MemoryRouter>,
    )
    screen.getByText('子项A').click()
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })
})
