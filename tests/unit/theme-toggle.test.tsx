import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ThemeToggle from '../../src/components/ThemeToggle.tsx'

/**
 * issue #54：主题切换按钮动作语义图标（亮=moon / 暗=sun）+ startViewTransition 包裹切换。
 * 单元层覆盖：SSR 确定性输出（服务端快照恒为亮色 → moon，水合后更新为实际主题）、
 * 图标随 <html> 的 .dark class 翻转（MutationObserver → useSyncExternalStore）、
 * localStorage 记忆、startViewTransition 包裹（class 在回调内切换）/ 不支持时直接切换、
 * prefers-reduced-motion 跳过过渡瞬时切换。
 * （整页交叉淡化、html 过渡标记类由 e2e 断言——见 app.spec.ts issue #54 段。）
 */

/** jsdom 无 matchMedia（点击处理器会读 prefers-reduced-motion）：默认 stub 为不 reduce */
function stubMatchMedia(reduced = false) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: reduced }))
}

/** jsdom 原生无 startViewTransition：stub 记录回调列表（class 切换在回调内执行） */
function stubStartViewTransition(): Array<() => void> {
  const callbacks: Array<() => void> = []
  const mock = vi.fn((cb: () => void) => {
    callbacks.push(cb)
    return { finished: Promise.resolve() }
  })
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    value: mock,
  })
  return callbacks
}

function iconName(button: HTMLElement): string | null {
  return button.querySelector('use')?.getAttribute('href') ?? null
}

beforeEach(() => {
  stubMatchMedia(false)
  document.documentElement.classList.remove('dark')
  localStorage.clear()
  // 移除可能的 startViewTransition stub（jsdom 原生无此 API → 回到不支持路径）
  delete (document as unknown as { startViewTransition?: unknown }).startViewTransition
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ThemeToggle（issue #54 动作语义图标 + View Transition）', () => {
  it('SSR 输出确定性：渲染 moon 图标（服务端快照恒为亮色，水合后更新为实际主题）', () => {
    const html = renderToString(<ThemeToggle />)
    expect(html).toContain('切换暗色模式')
    expect(html).toContain('icons.svg#moon-icon')
    expect(html).not.toContain('icons.svg#sun-icon')
  })

  it('亮色显示月亮、暗色显示太阳（动作语义：图标 = 切换后进入的主题），图标随 class 翻转', async () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: '切换暗色模式' })
    expect(button).toBeInTheDocument()
    expect(iconName(button)).toContain('moon-icon')

    // 客户端：观察 <html> 的 .dark class，暗色 → 太阳
    document.documentElement.classList.add('dark')
    await waitFor(() => expect(iconName(button)).toContain('sun-icon'))

    document.documentElement.classList.remove('dark')
    await waitFor(() => expect(iconName(button)).toContain('moon-icon'))
  })

  it('点击切换：翻转 html.dark + localStorage 记忆 + 图标翻转（不支持 View Transition 时直接切换）', async () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: '切换暗色模式' })

    fireEvent.click(button)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
    await waitFor(() => expect(iconName(button)).toContain('sun-icon'))

    fireEvent.click(button)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
    await waitFor(() => expect(iconName(button)).toContain('moon-icon'))
  })

  it('支持 startViewTransition 且非 reduced-motion：class 切换被包裹在回调内（回调执行后才翻转）', () => {
    const callbacks = stubStartViewTransition()
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: '切换暗色模式' })

    fireEvent.click(button)
    expect(document.startViewTransition).toHaveBeenCalledTimes(1)
    // 包裹语义：回调尚未执行时 class 未翻转（旧快照先被捕获，整页交叉淡化）
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(callbacks).toHaveLength(1)
    callbacks.forEach((cb) => cb())
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('prefers-reduced-motion：跳过 View Transition，直接瞬时切换', () => {
    stubMatchMedia(true)
    stubStartViewTransition()
    render(<ThemeToggle />)

    fireEvent.click(screen.getByRole('button', { name: '切换暗色模式' }))
    expect(document.startViewTransition).not.toHaveBeenCalled()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})
