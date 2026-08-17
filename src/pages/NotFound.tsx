import { Link } from 'react-router'

import PostRow from '../components/PostRow.tsx'
import { posts } from '../content/index.ts'

/**
 * 404 页（catch-all 路由）：h1「页面不存在」+ 迷你终端块（呈现 404 数字，
 * hero 终端同款视觉：恒黑底白字 + 四角括号）+「返回首页」入口 + 最近 2 篇
 * 非 draft 文章引导（复用 PostRow，与首页同一内容清单数据源）。误入的访问者
 * 明确知道页面不存在，并能快速回到内容流，而不是走进死胡同。
 */
export default function NotFound() {
  // 最近文章引导：内容清单按日期倒序（非 draft），取最新 2 篇，与首页同一数据源
  const recentPosts = posts.slice(0, 2)

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-mono">页面不存在</h1>
      <p>地址可能输错了，或链接已经失效。</p>

      {/* 迷你终端块：404 数字为视觉锚点（装饰性，aria-hidden；语义由 h1 承担）。
          结构沿用 hero 终端：四角括号 + 命令/响应行 + 大号 404 + 行尾闪烁光标 */}
      <div className="notfound-terminal" role="group" aria-label="错误提示终端">
        <span className="hero-terminal-corner hero-terminal-corner--tl" aria-hidden="true">
          ┌
        </span>
        <span className="hero-terminal-corner hero-terminal-corner--tr" aria-hidden="true">
          ┐
        </span>
        <div className="notfound-terminal-body">
          <p className="notfound-command">
            <span className="notfound-dollar" aria-hidden="true">
              $
            </span>
            GET /missing-page
          </p>
          <p className="notfound-response">404 Not Found</p>
          <p className="notfound-code" aria-hidden="true">
            404
            <span className="notfound-cursor" aria-hidden="true" />
          </p>
        </div>
        <span className="hero-terminal-corner hero-terminal-corner--bl" aria-hidden="true">
          └
        </span>
        <span className="hero-terminal-corner hero-terminal-corner--br" aria-hidden="true">
          ┘
        </span>
      </div>

      <p>
        <Link to="/">返回首页</Link>
      </p>

      <h2 className="font-mono">最近文章</h2>
      <ul className="post-row-list">
        {recentPosts.map((post, i) => (
          <PostRow key={post.slug} post={post} index={i} />
        ))}
      </ul>
    </div>
  )
}
