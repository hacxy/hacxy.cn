import type { TocItem } from '../content/types.ts'

import { useState } from 'react'

import Drawer from './Drawer.tsx'
import PostIndex from './PostIndex.tsx'
import PostToc from './PostToc.tsx'

/**
 * 文章页抽屉导航（issue #31）：窄屏下侧栏收进覆盖式抽屉。
 * 仅文章页渲染（PostPage 挂载；首页/关于页不渲染）：
 * - <1024px「目录」按钮可见（右栏收进抽屉）；<768px「文章」按钮也可见（左栏同步收进）；
 * - ≥1024px 按钮条整条隐藏（display:none → 不占 Tab 序），桌面侧栏常驻；
 * - 抽屉内容复用桌面侧栏组件（PostIndex / PostToc）：当前文章高亮（NavLink）
 *   与 scroll-spy（IntersectionObserver）与桌面一致；
 * - 两个抽屉互斥（同时只开一个），关闭方式 = 遮罩 / Esc / 关闭按钮。
 */
export default function PostDrawerNav({ toc }: { toc: TocItem[] }) {
  const [active, setActive] = useState<'index' | 'toc' | null>(null)
  const close = () => setActive(null)

  return (
    <>
      <div className="post-drawer-bar">
        <button
          type="button"
          className="drawer-trigger drawer-trigger--index"
          aria-haspopup="dialog"
          aria-expanded={active === 'index'}
          onClick={() => setActive('index')}
        >
          文章
        </button>
        {toc.length > 0 && (
          <button
            type="button"
            className="drawer-trigger drawer-trigger--toc"
            aria-haspopup="dialog"
            aria-expanded={active === 'toc'}
            onClick={() => setActive('toc')}
          >
            目录
          </button>
        )}
      </div>
      <Drawer open={active === 'index'} side="left" label="文章索引" onClose={close}>
        <PostIndex />
      </Drawer>
      <Drawer open={active === 'toc'} side="right" label="文章目录" onClose={close}>
        <PostToc toc={toc} />
      </Drawer>
    </>
  )
}
