import { useRef } from 'react'

import { useTheme, type Theme } from '../useTheme.ts'
import Icon from './Icon.tsx'

/**
 * 暗色模式切换（issue #54）：图标按钮随当前主题渲染动作语义符号——亮色 = 月亮
 * （点击进入暗色）、暗色 = 太阳（点击进入亮色），一眼看出切换后进入的主题。
 * aria-label「切换暗色模式」与 localStorage 记忆逻辑保持不变（既有 e2e/无障碍依赖）。
 *
 * 过渡（issue #54）：
 * - 支持 View Transitions API（html.vt-supported 由 index.html 入口脚本标记）且
 *   非 prefers-reduced-motion：class 切换包在 startViewTransition 内，整页交叉淡化
 *   （背景纹理与点阵 canvas 均在快照内，不瞬间变白/变黑）
 * - 不支持该 API：直接切换，CSS 过渡兜底（html:not(.vt-supported) 门控，与交叉淡化
 *   不双重动画）
 * - prefers-reduced-motion：JS 侧跳过 View Transition、CSS 侧禁用过渡，瞬时切换
 *
 * 图标由 useTheme 驱动（沿用既有主题快照机制）：SSR 与水合首帧输出确定性 moon
 * （亮色），水合后更新为实际主题——无 hydration mismatch。
 */
export default function ThemeToggle() {
  const theme = useTheme()
  // 未落地的目标主题：startViewTransition 的回调是异步任务，快速连点时新过渡会跳过
  // 前一回调（丢翻转）——把每次点击折叠进目标态，由最后一次回调一次落地
  const pendingTarget = useRef<Theme | null>(null)

  const toggle = () => {
    const root = document.documentElement
    const current: Theme =
      pendingTarget.current ?? (root.classList.contains('dark') ? 'dark' : 'light')
    pendingTarget.current = current === 'dark' ? 'light' : 'dark'

    const apply = () => {
      const target = pendingTarget.current
      pendingTarget.current = null
      if (!target) return
      root.classList.toggle('dark', target === 'dark')
      localStorage.setItem('theme', target)
    }

    const canViewTransition =
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      typeof document.startViewTransition === 'function'
    if (canViewTransition) {
      try {
        document.startViewTransition(apply)
      } catch {
        // API 存在但调用失败（如页面非激活态）：同步兜底，不丢本次切换
        apply()
      }
    } else {
      apply()
    }
  }

  return (
    <button type="button" aria-label="切换暗色模式" className="theme-toggle" onClick={toggle}>
      <Icon name={theme === 'dark' ? 'sun-icon' : 'moon-icon'} />
    </button>
  )
}
