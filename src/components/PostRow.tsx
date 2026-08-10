import type { Post } from '../content/types.ts'
import type { CSSProperties } from 'react'

import { Link } from 'react-router'

/**
 * 文章列表行（issue #19，父 PRD #16「连续终端流」最后一幕）：
 * 首页文章区从「终端窗口卡片」改为终端输出行——mono 日期 + 标题 + #标签，
 * 摘要不再渲染于列表（内容管线保留 description 字段，文章页/SEO 继续使用）。
 *
 * 设计决策：
 * - 整行为单个 <Link>（无嵌套链接）：日期/标题/标签任意位置点击均进入
 *   /posts/:slug；键盘可达（真实链接 + :focus-visible 反白反馈）
 * - hover / focus-visible 反白：复用全站 accent 令牌（亮色黑底白字、
 *   暗色白底黑字反色），与页面 chrome 的链接反馈机制一致
 * - 标签仅展示、不跳转（当前无标签路由）：渲染为 #tag 纯文本 span，非链接
 * - 行内容完全由内容清单驱动（title / date / tags），新增文章自动上首页，
 *   内容管线零改动
 * - 入场动画由 Home 侧编排（--i 行号 + 连续终端流时序，纯 CSS）：
 *   本组件只负责单行结构与样式
 */
export default function PostRow({ post, index }: { post: Post; index: number }) {
  // 行号：CSS 演出编排参数（逐行错开入场由 --i 计算延迟）
  const style = { '--i': index } as CSSProperties

  return (
    <li className="post-row-enter" style={style}>
      <Link to={`/posts/${post.slug}`} className="post-row">
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
