import { Link, useParams } from 'react-router'

import { posts } from '../content/index.ts'
import NotFound from './NotFound.tsx'

/**
 * 文章详情页：正文为构建期渲染完成的 HTML 字符串（含 Shiki 高亮与标题锚点），
 * 客户端经 dangerouslySetInnerHTML 挂载，同一字符串服务端/客户端完全一致，
 * 从根上避免 hydration mismatch（PRD「渲染策略」决策）。
 *
 * 头部信息区（issue #28）：大标题 + mono 日期/updated（有才显示）+ #标签 + 描述；
 * 正文排版为干净 prose 风格（层级/留白/独立成块，见 index.css .post-body），
 * 终端美学保留在首页与列表。内嵌「目录」块保持不变（后续工单移除）。
 * 正文列维持 42rem 居中——全站容器放宽为 max-w-6xl 后，文章页为未来三栏布局的中间栏。
 */
export default function PostPage() {
  const { slug } = useParams()
  const postIndex = posts.findIndex((item) => item.slug === slug)
  const post = postIndex >= 0 ? posts[postIndex] : undefined

  if (!post) {
    return <NotFound />
  }

  // 内容清单按日期倒序（最新在前）：上一条 = 更新的文章，下一条 = 更旧的
  const newer = posts[postIndex - 1]
  const older = posts[postIndex + 1]

  return (
    <article className="mx-auto max-w-2xl">
      {/* 头部信息区：大标题 + mono 元数据（日期/updated/#标签）+ 描述，与正文以细线分隔 */}
      <header className="post-header">
        <h1 className="post-title">{post.title}</h1>
        <div className="post-meta">
          <time dateTime={post.date}>{post.date}</time>
          {post.updated && (
            <>
              <span aria-hidden="true">·</span>
              <span className="post-updated">
                updated <time dateTime={post.updated}>{post.updated}</time>
              </span>
            </>
          )}
        </div>
        {post.tags.length > 0 && (
          <div className="post-tags" aria-label="标签">
            {post.tags.map((tag) => (
              <span key={tag} className="post-tag">
                #{tag}
              </span>
            ))}
          </div>
        )}
        {post.description && <p className="post-description">{post.description}</p>}
      </header>

      {post.toc.length > 0 && (
        <nav aria-label="文章目录">
          <h2>目录</h2>
          <ul>
            {post.toc.map((item) => (
              <li key={item.id} className={item.level === 3 ? 'pl-4' : undefined}>
                <a href={`#${item.id}`}>{item.text}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="post-body" dangerouslySetInnerHTML={{ __html: post.html }} />

      {(newer || older) && (
        <nav aria-label="上一篇/下一篇">
          {newer && (
            <p>
              <Link to={`/posts/${newer.slug}`}>上一篇：{newer.title}</Link>
            </p>
          )}
          {older && (
            <p>
              <Link to={`/posts/${older.slug}`}>下一篇：{older.title}</Link>
            </p>
          )}
        </nav>
      )}
    </article>
  )
}
