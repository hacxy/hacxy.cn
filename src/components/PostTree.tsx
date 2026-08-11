import type { TreeNode } from '../content/tree.ts'

import { useMemo, useState } from 'react'
import { NavLink, useParams } from 'react-router'

import { posts } from '../content/index.ts'
import { ancestorPaths, buildPostTree } from '../content/tree.ts'

/**
 * 文章页左栏层级树（issue #44）：根层文章 + 各级文件夹（可折叠抽屉）。
 * 树由内容清单平铺列表派生（buildPostTree，同一来源）；桌面侧栏与移动端
 * 覆盖式抽屉复用同一组件（PostIndex 包裹，<768px「文章」按钮抽屉内容相同）。
 *
 * 行为契约：
 * - 当前文章所在分支自动展开至所在层（挂载与客户端导航时按祖先文件夹路径补充）；
 * - 子文件夹为可折叠抽屉：按钮 aria-expanded 标记可见状态，点击展开/收起；
 * - 同层内文件夹字母序在前、文章日期倒序在后（递归同规则，由 buildPostTree 保证）；
 * - 当前文章沿用全站 nav-active 高亮（加粗 + 下划线，NavLink 自动注入
 *   aria-current="page"）。
 */

/** 构建期一次派生：树 = 清单之上的派生结构（同一来源，纯函数、确定性） */
const TREE = buildPostTree(posts)

/** 索引行类名：行形态复用首页终端行（.post-row），当前文章追加 nav-active——
 *  全站导航高亮机制（加粗 + 下划线，见 index.css .post-index a.nav-active，
 *  与顶部导航 .site-nav a.nav-active 同一令牌） */
const indexLinkClass = ({ isActive }: { isActive: boolean }) =>
  `post-row${isActive ? ' nav-active' : ''}`

export default function PostTree() {
  const slug = useParams()['*'] ?? ''
  // 当前文章所在分支：祖先文件夹路径（根层文章为空 → 无自动展开）
  const ancestors = useMemo(() => ancestorPaths(slug), [slug])
  // 折叠状态：以目录路径为键；初始即含当前分支（SSR 首帧与 hydration 一致）
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(ancestors))

  // 客户端导航（树内点击 / 浏览器前进后退切换文章）时保持手动展开状态，
  // 并把新文章的祖先文件夹补充展开——「调整 state 以响应 prop 变化」的
  // React 惯用法（渲染期条件更新，非 effect，官方推荐替代 effect 的方案）
  const [prevSlug, setPrevSlug] = useState(slug)
  if (slug !== prevSlug) {
    setPrevSlug(slug)
    setExpanded((prev) => {
      if (ancestors.every((path) => prev.has(path))) return prev
      const next = new Set(prev)
      for (const path of ancestors) next.add(path)
      return next
    })
  }

  const toggle = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })

  return <TreeBranch nodes={TREE} expanded={expanded} onToggle={toggle} />
}

/** 递归渲染层级树的一层：文件夹（可折叠抽屉按钮）+ 文章（终端行 NavLink） */
function TreeBranch({
  nodes,
  expanded,
  onToggle,
}: {
  nodes: TreeNode[]
  expanded: Set<string>
  onToggle: (path: string) => void
}) {
  return (
    <ul className="post-tree-list">
      {nodes.map((node) =>
        node.type === 'folder' ? (
          <li key={`folder-${node.path}`}>
            <button
              type="button"
              className="post-tree-folder"
              aria-expanded={expanded.has(node.path)}
              onClick={() => onToggle(node.path)}
            >
              {/* 折叠标记：装饰性（aria-hidden），▸ 收起 / ▾ 展开 */}
              <span className="post-tree-folder-marker" aria-hidden="true">
                {expanded.has(node.path) ? '▾' : '▸'}
              </span>
              <span className="post-tree-folder-name">{node.name}/</span>
            </button>
            {/* 收起时不渲染子级：不进可访问性树、不占 Tab 序（与抽屉条件挂载同一模式） */}
            {expanded.has(node.path) && (
              <TreeBranch nodes={node.children} expanded={expanded} onToggle={onToggle} />
            )}
          </li>
        ) : (
          <li key={`post-${node.post.slug}`}>
            <NavLink to={`/posts/${node.post.slug}`} className={indexLinkClass}>
              {/* 行首终端提示符：装饰性（aria-hidden），与首页终端行同构（hover/focus 淡入） */}
              <span className="post-row-prompt" aria-hidden="true">
                &gt;
              </span>
              <time dateTime={node.post.date} className="post-row-date">
                {node.post.date}
              </time>
              <span className="post-row-title">{node.post.title}</span>
            </NavLink>
          </li>
        ),
      )}
    </ul>
  )
}
