import { useEffect, useRef, type ReactNode } from 'react'

interface DrawerProps {
  /** 是否打开：打开时锁定正文滚动、焦点移入抽屉；关闭时卸载内容并还原 */
  open: boolean
  /** 滑出方向：左（文章索引）/ 右（目录） */
  side: 'left' | 'right'
  /** 抽屉语义标签（role="dialog" 的 aria-label） */
  label: string
  onClose: () => void
  children: ReactNode
}

/**
 * 覆盖式抽屉容器：移动端侧栏收进抽屉后的通用骨架。
 * - 遮罩点击 / Esc / 关闭按钮均可收起；
 * - 打开时锁定正文滚动（html overflow: hidden，关闭还原）；
 * - 打开时焦点移入关闭按钮、Tab 焦点循环在抽屉内（键盘无障碍），关闭后焦点归还触发按钮；
 * - 关闭时不渲染内容（条件挂载）：不进可访问性树、不占 Tab 序。
 */
export default function Drawer({ open, side, label, onClose, children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    // 打开前的正文滚动状态（关闭时还原）；记录触发按钮（关闭后焦点归还）。
    // 锁在 documentElement 而非 body：body 上 overflow:hidden 会把视口滚动容器
    // 让位给 body、重置滚动位置到顶部（Chromium），html 上锁定则保留滚动位置。
    const prevOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      // Tab 焦点陷阱：循环在抽屉内可聚焦元素之间
      if (event.key !== 'Tab') return
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables || focusables.length === 0) return
      const first = focusables.item(0)
      const last = focusables.item(focusables.length - 1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    closeRef.current?.focus()

    return () => {
      document.documentElement.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
      trigger?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label={label}>
      <div className="drawer-overlay" onClick={onClose} />
      <div ref={panelRef} className={`drawer-panel drawer-panel--${side}`}>
        <button
          ref={closeRef}
          type="button"
          className="drawer-close"
          aria-label="关闭"
          onClick={onClose}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  )
}
