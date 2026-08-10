import { NavLink } from 'react-router'

import { posts } from '../content/index.ts'

/** 索引行类名：行形态复用首页终端行（.post-row），当前文章追加 nav-active——
 *  全站导航高亮机制（加粗 + 下划线，见 index.css .post-index a.nav-active，
 *  与顶部导航 .site-nav a.nav-active 同一令牌） */
const indexLinkClass = ({ isActive }: { isActive: boolean }) =>
  `post-row${isActive ? ' nav-active' : ''}`

/**
 * 文章页左栏文章索引（issue #29）：sticky 常驻全部文章列表，
 * 与首页终端行同构（mono 日期 + 标题，日期倒序由内容清单保证），
 * 当前文章加粗 + 下划线高亮（NavLink 自动注入 aria-current="page"）。
 * <768px 由 CSS 隐藏（抽屉交互由后续工单接入），仅渲染于文章页。
 */
export default function PostIndex() {
  return (
    <nav aria-label="文章索引" className="post-index">
      <ul className="post-row-list">
        {posts.map((post) => (
          <li key={post.slug}>
            <NavLink to={`/posts/${post.slug}`} className={indexLinkClass}>
              {/* 行首终端提示符：装饰性（aria-hidden），与首页终端行同构（hover/focus 淡入） */}
              <span className="post-row-prompt" aria-hidden="true">
                &gt;
              </span>
              <time dateTime={post.date} className="post-row-date">
                {post.date}
              </time>
              <span className="post-row-title">{post.title}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
