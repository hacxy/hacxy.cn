import type { Post } from '../content/types.ts'

import { Link } from 'react-router'

/**
 * 文章卡片（issue #14，PRD #8 文章卡片切片，用户故事 20/21/22/23/28）：
 * 首页文章区从裸列表改为终端窗口样式卡片——标题栏（●●● + slug 文件名）+
 * 正文（标题、摘要、日期、标签徽章），与 hero 终端窗口风格统一。
 *
 * 设计决策：
 * - 内容完全由内容清单驱动（title / description / date / tags），新增文章
 *   自动上首页，不触碰内容管线
 * - 整卡为单个 <Link>（标题栏/正文整卡可点击进入 /posts/:slug），无嵌套链接
 * - 标签徽章仅展示、不跳转（当前无标签路由），badge 为 <li> 非 <a>
 * - 入场动画与 hover 反馈均为纯 CSS（.post-card-enter / .post-card:hover），
 *   prefers-reduced-motion 下禁用
 */
export default function PostCard({ post }: { post: Post }) {
  return (
    <li className="post-card-enter">
      <Link to={`/posts/${post.slug}`} className="post-card text-accent">
        {/* 终端标题栏：●●● 装饰圆点 + slug 文件名（等宽字体，同 hero 终端窗口） */}
        <div className="post-card-bar">
          <span className="terminal-dot terminal-dot--red" aria-hidden="true" />
          <span className="terminal-dot terminal-dot--yellow" aria-hidden="true" />
          <span className="terminal-dot terminal-dot--green" aria-hidden="true" />
          <span className="post-card-filename">{post.slug}.md</span>
        </div>
        <div className="post-card-body">
          <h2 className="post-card-title">{post.title}</h2>
          {/* dev 模式清单含 draft 文章，构建产物不含；此处标记仅 dev 出现 */}
          {post.draft && <span>（草稿）</span>}
          <p className="post-card-description">{post.description}</p>
          <div className="post-card-meta">
            <time dateTime={post.date} className="post-card-date">
              {post.date}
            </time>
            {post.tags.length > 0 && (
              <ul className="post-card-tags" aria-label="标签">
                {post.tags.map((tag) => (
                  <li key={tag} className="post-card-tag">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Link>
    </li>
  )
}
