import type { Post } from '../content/types.ts'
import type { CSSProperties } from 'react'

import { Link } from 'react-router'

/**
 * 文章列表行：首页文章区终端输出行——mono 日期 + 标题 + #标签。
 * - 整行为单个 <Link>：任意位置点击进入 /posts/:slug；
 * - hover / focus-visible：行首沟槽淡入「>」终端提示符（槽始终占位 → 内容零位移），
 *   标题变 accent 色 + 下划线（字重保持 400）；
 * - 标签仅展示、不跳转（#tag 纯文本，非链接）；
 * - 入场动画由 Home 侧编排（--i 行号），本组件只负责单行结构。
 */
export default function PostRow({ post, index }: { post: Post; index: number }) {
  // 行号：CSS 演出编排参数（逐行错开入场由 --i 计算延迟）
  const style = { '--i': index } as CSSProperties

  return (
    <li className="post-row-enter" style={style}>
      <Link to={`/posts/${post.slug}`} className="post-row">
        {/* 行首终端提示符：装饰性（aria-hidden），hover/键盘焦点时淡入；
            槽始终占位 → 内容零位移 */}
        <span className="post-row-prompt" aria-hidden="true">
          &gt;
        </span>
        <time dateTime={post.date} className="post-row-date">
          {post.date}
        </time>
        <span className="post-row-title">{post.title}</span>
        {post.tags.length > 0 && (
          <span className="post-row-tags" aria-label="标签">
            {post.tags.map((tag) => (
              <span key={tag} className="post-row-tag">
                #{tag}
              </span>
            ))}
          </span>
        )}
      </Link>
    </li>
  )
}
