import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import Header from './index'

function renderHeader(theme: 'light' | 'dark' = 'light') {
  const onToggleTheme = vi.fn()
  render(
    <MemoryRouter>
      <Header theme={theme} onToggleTheme={onToggleTheme} />
    </MemoryRouter>,
  )
  return { onToggleTheme }
}

describe('Header', () => {
  it('渲染站点作者名与导航文字链接', () => {
    renderHeader()
    // blogConfig.author = "Hacxy"（fixtures）
    expect(screen.getByText('hacxy')).toBeInTheDocument()
    expect(screen.getByText('Posts')).toBeInTheDocument()
  })

  it('外部链接以空白页打开', () => {
    renderHeader()
    const extLink = screen.getByRole('link', { name: 'lucide:github' })
    expect(extLink).toHaveAttribute('href', 'https://github.com/hacxy')
    expect(extLink).toHaveAttribute('target', '_blank')
    expect(extLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('浅色主题下切换按钮 aria-label 指向深色', () => {
    renderHeader('light')
    expect(screen.getByRole('button', { name: '切换到深色模式' })).toBeInTheDocument()
  })

  it('深色主题下切换按钮 aria-label 指向浅色', () => {
    renderHeader('dark')
    expect(screen.getByRole('button', { name: '切换到浅色模式' })).toBeInTheDocument()
  })

  it('点击切换按钮触发 onToggleTheme 回调', async () => {
    const user = userEvent.setup()
    const { onToggleTheme } = renderHeader()
    await user.click(screen.getByRole('button', { name: '切换到深色模式' }))
    expect(onToggleTheme).toHaveBeenCalledTimes(1)
  })

  it('外部图标链接仅图标无文字时带图标链接 class', () => {
    renderHeader()
    // fixture 中 github 是 icon-only 导航
    const iconLink = screen.getByRole('link', { name: 'lucide:github' })
    expect(iconLink.className).toContain('navIconLink')
  })
})
