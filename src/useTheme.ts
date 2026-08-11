import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

/** 客户端主题快照：<html> 的 .dark class（主题状态单一来源） */
function readTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/** 订阅主题变化：MutationObserver 监听 html class（ThemeToggle / 防闪烁脚本都改它） */
function subscribeTheme(onStoreChange: () => void): () => void {
  const observer = new MutationObserver(onStoreChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

/**
 * 当前主题（亮/暗，运行时状态，issue #42）。
 * SSR 安全（无 hydration mismatch）：getServerSnapshot 恒返回确定性值 'light'——
 * SSR 与 hydration 首帧输出一致；水合完成后 React 切换到客户端快照（实际主题：
 * localStorage 偏好 / 系统偏好 / 用户切换），即「SSR 输出确定性值、水合后更新为
 * 实际主题」。切换主题（html class 变化）即时触发订阅更新。
 */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, readTheme, () => 'light')
}
