import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getInitialTheme, applyTheme } from './theme'

describe('getInitialTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('localStorage 有值时优先返回', () => {
    localStorage.setItem('theme', 'dark')
    expect(getInitialTheme()).toBe('dark')
  })

  it('localStorage 值非法时回退系统偏好', () => {
    localStorage.setItem('theme', 'invalid')
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList)
    expect(getInitialTheme()).toBe('dark')
  })

  it('无存储且系统偏好 light 时返回 light', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
    } as MediaQueryList)
    expect(getInitialTheme()).toBe('light')
  })
})

describe('applyTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('设置 html data-theme 属性与 colorScheme', () => {
    applyTheme('dark')
    const html = document.documentElement
    expect(html.getAttribute('data-theme')).toBe('dark')
    expect(html.style.colorScheme).toBe('dark')
    expect(html.style.backgroundColor).toBe('rgb(17, 17, 17)')
  })

  it('light 主题写入对应背景色', () => {
    applyTheme('light')
    expect(document.documentElement.style.backgroundColor).toBe('rgb(245, 245, 242)')
  })

  it('同步 theme-color meta 标签', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
    applyTheme('dark')
    expect(meta.content).toBe('#111111')
    meta.remove()
  })

  it('过渡动画结束后移除 theme-transitioning 类', () => {
    applyTheme('dark')
    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(true)
    vi.advanceTimersByTime(200)
    expect(document.documentElement.classList.contains('theme-transitioning')).toBe(false)
  })
})
