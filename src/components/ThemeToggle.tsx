/**
 * 暗色模式切换：直接翻转 <html> 的 .dark class 并记忆偏好到 localStorage。
 * 无内部状态——按钮内容不依赖主题，SSR 与客户端输出一致，杜绝 hydration mismatch；
 * 当前主题的视觉反馈由 CSS（dark: variant）承担。
 */
export default function ThemeToggle() {
  return (
    <button
      type="button"
      aria-label="切换暗色模式"
      onClick={() => {
        const root = document.documentElement
        const next = !root.classList.contains('dark')
        root.classList.toggle('dark', next)
        localStorage.setItem('theme', next ? 'dark' : 'light')
      }}
    >
      主题
    </button>
  )
}
