import { useSyncExternalStore } from 'react'

import Icon from './Icon.tsx'

/**
 * 暗色模式切换：动作语义图标 + 整页过渡。
 * - 图标按当前主题渲染动作语义：亮色 = 月亮（点击进入暗色）、暗色 = 太阳（点击进入亮色）；
 * - 当前主题经 useSyncExternalStore 观察 <html> 的 .dark class：服务端快照恒为亮色
 *   （确定性输出），水合后更新为实际主题，杜绝 hydration mismatch；
 * - 点击切换：支持 View Transitions API 且非 prefers-reduced-motion 时 class 切换被
 *   startViewTransition 包裹（整页交叉淡化）；否则直接切换（CSS 过渡兜底 / reduce 瞬时）。
 */

/** 观察 <html> 是否带 .dark：订阅 class 属性变更；服务端快照恒 false（确定性输出） */
function useIsDark(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const observer = new MutationObserver(onStoreChange)
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
      return () => observer.disconnect()
    },
    () => document.documentElement.classList.contains('dark'),
    () => false,
  )
}

export default function ThemeToggle() {
  const dark = useIsDark()

  const toggle = () => {
    const root = document.documentElement
    const next = !root.classList.contains('dark')
    // class 切换 + 记忆：放同一闭包，View Transition 回调内执行（旧快照先被捕获）
    const apply = () => {
      root.classList.toggle('dark', next)
      localStorage.setItem('theme', next ? 'dark' : 'light')
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (document.startViewTransition && !reducedMotion) {
      const vt = document.startViewTransition(apply)
      vt.finished.catch(() => {
        /* 过渡被中断（如快速连续点击/导航离开）时静默忽略 */
      })
    } else {
      apply()
    }
  }

  return (
    <button type="button" aria-label="切换暗色模式" className="theme-toggle" onClick={toggle}>
      <Icon name={dark ? 'sun-icon' : 'moon-icon'} />
    </button>
  )
}
