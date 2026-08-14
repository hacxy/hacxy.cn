import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ThemeToggle from '../../src/components/ThemeToggle.tsx'

/**
 * issue #54 主题切换按钮单元测试：图标语义（亮=moon / 暗=sun）、class 翻转 + localStorage
 * 记忆、View Transition 各分支（不支持 / reduced-motion / 回调异步竞态 / 调用抛异常）。
 * jsdom 无 matchMedia 与 startViewTransition——前者 stub，后者按用例注入。
 */

/** 注入 matchMedia stub（jsdom 未实现）：reducedMotion 控制 (prefers-reduced-motion: reduce) 是否命中 */
function stubMatchMedia(reducedMotion = false) {
  const mql = vi.fn(() => ({ matches: reducedMotion }))
  ;(window as { matchMedia?: unknown }).matchMedia = mql
  return mql
}

/** 注入 startViewTransition stub：'async' = 回调排队异步落地（真实浏览器行为：新过渡跳过
 *  前一回调，只保留最新）；'throw' = API 存在但调用抛异常 */
function stubStartViewTransition(behavior: 'async' | 'throw') {
  let pending: Array<() => void> = []
  const vt = vi.fn((callback: () => void) => {
    if (behavior === 'throw') throw new Error('startViewTransition 不可用')
    pending = [callback]
    return {}
  })
  ;(document as { startViewTransition?: unknown }).startViewTransition = vt
  return {
    vt,
    /** 模拟浏览器排队任务：执行最新回调（旧回调已被新过渡跳过） */
    flush: async () => {
      await act(async () => {
        pending.splice(0).forEach((cb) => cb())
      })
    },
  }
}

beforeEach(() => {
  document.documentElement.classList.remove('dark')
  localStorage.clear()
  stubMatchMedia()
})

afterEach(() => {
  delete (window as { matchMedia?: unknown }).matchMedia
  delete (document as { startViewTransition?: unknown }).startViewTransition
})

describe('ThemeToggle（issue #54 主题切换按钮）', () => {
  it('图标随主题渲染动作语义符号：亮色 = 月亮、暗色 = 太阳（useTheme 订阅 html class 变化）', async () => {
    render(<ThemeToggle />)
    const toggle = screen.getByRole('button', { name: '切换暗色模式' })
    expect(toggle.querySelector('use')).toHaveAttribute('href', '/icons.svg#moon-icon')

    await act(async () => document.documentElement.classList.add('dark'))
    expect(toggle.querySelector('use')).toHaveAttribute('href', '/icons.svg#sun-icon')

    await act(async () => document.documentElement.classList.remove('dark'))
    expect(toggle.querySelector('use')).toHaveAttribute('href', '/icons.svg#moon-icon')
  })

  it('不支持 View Transitions API（jsdom 默认）：同步翻转 class 并记忆 localStorage', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: '切换暗色模式' })

    fireEvent.click(button)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')

    fireEvent.click(button)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('prefers-reduced-motion：跳过 View Transition，瞬时切换', () => {
    stubMatchMedia(true)
    const { vt } = stubStartViewTransition('async')
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: '切换暗色模式' })

    fireEvent.click(button)
    expect(vt).not.toHaveBeenCalled()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('startViewTransition 回调异步落地：同一任务内连点不丢翻转（回归：快速连点竞态）', async () => {
    const { vt, flush } = stubStartViewTransition('async')
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: '切换暗色模式' })

    // 两次点击在首个回调落地前发生：新过渡跳过前一回调，但两次翻转目标必须都被保留
    // （亮→暗→亮 = 回到亮色，localStorage 同步为 light）
    fireEvent.click(button)
    fireEvent.click(button)
    expect(vt).toHaveBeenCalledTimes(2)
    await flush()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')

    // 三连点：折叠后目标 = 暗色（亮→暗→亮→暗）
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)
    await flush()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('startViewTransition 调用抛异常：同步兜底切换，不丢点击', () => {
    stubStartViewTransition('throw')
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: '切换暗色模式' })

    fireEvent.click(button)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})
