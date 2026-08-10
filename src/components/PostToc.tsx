import type { TocItem } from '../content/types.ts'

import { useEffect, useState } from 'react'

/**
 * 文章页右栏锚点目录（issue #30）：h2/h3 两级 + scroll-spy。
 * 点击目录项 = 原生 hash 跳转（<a href="#id">，平滑滚动由
 * html { scroll-behavior: smooth } 提供、标题 scroll-margin-top 保证定位偏移）。
 * 当前章节高亮三路兜底：
 * 1. onClick 点击瞬间置为当前章节（即时反馈）；
 * 2. 挂载/路由切换时读 location.hash 同步（原生锚点平滑滚动不派发 IO 回调，
 *    且水合前点击 onClick 尚未挂载——hash 是最可靠的事实来源，同时覆盖深链）；
 * 3. IntersectionObserver scroll-spy：观察标题（观察带 = 视口顶部 40%），
 *    每次回调按文档序重算当前章节 = 顶边位于观察带底线之上的最后一个标题——
 *    双向滚动一致、长章节阅读（观察带内无标题）时保持当前章节不闪烁。
 * 仅 ≥1024px 显示（CSS）；toc 为空时父级不渲染本组件（布局退化为两栏）。
 */

/** 观察带底线 = 视口高度的 40%（与 rootMargin '0px 0px -60% 0px' 一致） */
const BAND_BOTTOM_RATIO = 0.4

export default function PostToc({ toc }: { toc: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    const ids = toc.map((item) => item.id)

    // 从 location.hash 同步当前章节（点击/深链/前进后退）：hash 为百分号编码，
    // 解码后须是目录项 id 才生效
    const syncFromHash = () => {
      const raw = window.location.hash.slice(1)
      if (!raw) return
      let id: string
      try {
        id = decodeURIComponent(raw)
      } catch {
        return
      }
      if (ids.includes(id)) setActiveId(id)
    }
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)

    const headings = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    // 当前章节 = 文档序中最后一个顶边位于观察带底线之上的标题（双向滚动一致）
    const update = () => {
      const limit = window.innerHeight * BAND_BOTTOM_RATIO
      let current: string | null = null
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) break
        if (el.getBoundingClientRect().top <= limit) current = id
        else break
      }
      if (current) setActiveId(current)
    }

    const observer = new IntersectionObserver(update, {
      // 观察带 = 视口顶部 40%（bottom 收缩 60%）
      rootMargin: '0px 0px -60% 0px',
    })
    headings.forEach((heading) => observer.observe(heading))

    return () => {
      observer.disconnect()
      window.removeEventListener('hashchange', syncFromHash)
    }
  }, [toc])

  return (
    <nav aria-label="文章目录" className="post-toc">
      <p className="post-toc-title">目录</p>
      <ul className="post-toc-list">
        {toc.map((item) => (
          <li key={item.id} className={item.level === 3 ? 'post-toc-item--h3' : undefined}>
            <a
              href={`#${item.id}`}
              onClick={() => setActiveId(item.id)}
              aria-current={activeId === item.id ? 'true' : undefined}
              className={activeId === item.id ? 'post-toc-active' : undefined}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
